/**
 * 存储容量管理 API 路由
 * 处理存储使用情况监控和自动清理
 */

import { getBucketUsage, listImages, deleteImage } from '../../lib/cloudflare';

// 存储限额（默认 5GB）
const STORAGE_QUOTA_MB = parseInt(process.env.STORAGE_QUOTA_MB || 5120);
// 警告阈值（默认 80%）
const WARNING_THRESHOLD = parseFloat(process.env.WARNING_THRESHOLD || 0.8);
// 客户端缓存时间（默认值）
const CLIENT_CACHE_SHORT = parseInt(process.env.CLIENT_CACHE_SHORT || 60); // 短期缓存，默认 60 秒
const CLIENT_CACHE_LONG = parseInt(process.env.CLIENT_CACHE_LONG || 300); // 长期缓存，默认 5 分钟

export default async function handler(req, res) {
  try {
    // 根据请求方法处理不同操作
    switch (req.method) {
      case 'GET':
        // 获取存储使用情况
        return await handleGetStorageUsage(req, res);
      case 'POST':
        // 执行自动清理
        return await handleAutoCleanup(req, res);
      default:
        return res.status(405).json({ error: '方法不允许' });
    }
  } catch (error) {
    console.error('存储管理操作失败:', error);
    return res.status(500).json({ error: `操作失败: ${error.message}` });
  }
}

/**
 * 处理获取存储使用情况请求
 * 优化版本：添加缓存控制和性能指标
 */
async function handleGetStorageUsage(req, res) {
  const requestStartTime = Date.now();
  
  // 检查是否要强制刷新缓存
  const forceRefresh = req.query.refresh === 'true';
  
  // 获取存储使用情况
  const usage = await getBucketUsage(forceRefresh);
  
  // 计算使用百分比
  const usagePercentage = (usage.totalSizeMB / STORAGE_QUOTA_MB) * 100;
  const isWarning = usagePercentage >= WARNING_THRESHOLD * 100;
  
  // 添加缓存控制头
  // 使用环境变量中配置的缓存时间
  if (usage.fromCache) {
    // 如果数据来自缓存，使用短期缓存
    res.setHeader('Cache-Control', `public, max-age=${CLIENT_CACHE_SHORT}`);
  } else {
    // 如果是新获取的数据，使用长期缓存
    res.setHeader('Cache-Control', `public, max-age=${CLIENT_CACHE_LONG}`);
  }
  
  // 计算请求总耗时
  const requestTime = Date.now() - requestStartTime;
  
  return res.status(200).json({
    usage,
    quota: {
      totalMB: STORAGE_QUOTA_MB,
      usedMB: usage.totalSizeMB,
      availableMB: STORAGE_QUOTA_MB - usage.totalSizeMB,
      usagePercentage,
      isWarning,
    },
    performance: {
      requestTime,
      fromCache: usage.fromCache || false,
      queryTime: usage.queryTime || 0
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * 处理自动清理请求
 */
async function handleAutoCleanup(req, res) {
  // 获取请求参数
  const { strategy = 'oldest', limit = 10 } = req.body;
  
  // 获取存储使用情况
  const usage = await getBucketUsage();
  
  // 计算使用百分比
  const usagePercentage = (usage.totalSizeMB / STORAGE_QUOTA_MB) * 100;
  
  // 如果使用率低于警告阈值，不需要清理
  if (usagePercentage < WARNING_THRESHOLD * 100) {
    return res.status(200).json({
      success: true,
      message: '存储使用率正常，无需清理',
      cleaned: 0,
      usage,
    });
  }
  
  // 获取所有图片
  const imagesResult = await listImages(1000);
  const images = imagesResult.images;
  
  // 根据策略排序图片
  let imagesToDelete = [];
  
  if (strategy === 'oldest') {
    // 按最后修改时间排序，最旧的在前面
    imagesToDelete = images.sort((a, b) => new Date(a.lastModified) - new Date(b.lastModified));
  } else if (strategy === 'largest') {
    // 按大小排序，最大的在前面
    imagesToDelete = images.sort((a, b) => b.size - a.size);
  } else if (strategy === 'leastAccessed') {
    // 按访问次数排序（如果有记录）
    // 这里简化处理，实际应该从元数据中获取访问次数
    imagesToDelete = images;
  }
  
  // 限制删除数量
  imagesToDelete = imagesToDelete.slice(0, parseInt(limit));
  
  // 执行删除
  const deletedImages = [];
  let deletedSize = 0;
  
  for (const image of imagesToDelete) {
    try {
      await deleteImage(image.key);
      deletedImages.push(image.key);
      deletedSize += image.size;
    } catch (error) {
      console.error(`删除图片 ${image.key} 失败:`, error);
    }
  }
  
  // 获取更新后的存储使用情况
  const newUsage = await getBucketUsage();
  
  return res.status(200).json({
    success: true,
    message: `已清理 ${deletedImages.length} 个文件`,
    cleaned: deletedImages.length,
    deletedSize,
    deletedSizeMB: Math.round(deletedSize / (1024 * 1024) * 100) / 100,
    deletedFiles: deletedImages,
    previousUsage: usage,
    currentUsage: newUsage,
  });
}

/**
 * 检查存储使用情况并发送警告
 * 此函数可以由定时任务调用
 */
export async function checkStorageUsage() {
  try {
    // 获取存储使用情况
    const usage = await getBucketUsage();
    
    // 计算使用百分比
    const usagePercentage = (usage.totalSizeMB / STORAGE_QUOTA_MB) * 100;
    
    // 如果使用率超过警告阈值，记录警告
    if (usagePercentage >= WARNING_THRESHOLD * 100) {
      console.warn(`存储使用率警告: ${usagePercentage.toFixed(2)}% (${usage.totalSizeMB}MB/${STORAGE_QUOTA_MB}MB)`);
      
      // 这里可以添加发送通知的逻辑，如发送邮件或推送通知
      
      return {
        warning: true,
        message: `存储使用率警告: ${usagePercentage.toFixed(2)}%`,
        usage,
      };
    }
    
    return {
      warning: false,
      message: '存储使用率正常',
      usage,
    };
  } catch (error) {
    console.error('检查存储使用情况失败:', error);
    throw error;
  }
}
