/**
 * 图片管理 API 路由
 * 处理图片列表获取、删除等操作
 */

import { listImages, deleteImage, getBucketUsage } from '../../lib/cloudflare';
import { removeImageFromCache } from '../../lib/cacheManager';
import { normalizeImageArray } from '../../lib/imageDataModel';
import { deleteImageFromSupabase } from '../../lib/supabaseService';

export default async function handler(req, res) {
  try {
    // 根据请求方法处理不同操作
    switch (req.method) {
      case 'GET':
        // 获取图片列表
        return await handleGetImages(req, res);
      case 'DELETE':
        // 删除图片
        return await handleDeleteImage(req, res);
      case 'HEAD':
        // 获取存储使用情况
        return await handleGetUsage(req, res);
      default:
        return res.status(405).json({ error: '方法不允许' });
    }
  } catch (error) {
    console.error('图片管理操作失败:', error);
    return res.status(500).json({ error: `操作失败: ${error.message}` });
  }
}

/**
 * 处理获取图片列表请求
 */
async function handleGetImages(req, res) {
  // 获取查询参数
  const { limit = 100, token, tag } = req.query;
  
  // 获取图片列表
  const result = await listImages(parseInt(limit), token || null);
  
  // 如果指定了标签，过滤结果
  if (tag) {
    result.images = result.images.filter(image => {
      const tags = image.metadata?.tags ? JSON.parse(image.metadata.tags) : [];
      return tags.includes(tag);
    });
    result.count = result.images.length;
  }
  
  // 使用标准化的图片数据模型处理返回的图片数组
  result.images = normalizeImageArray(result.images);
  result.count = result.images.length;
  
  return res.status(200).json(result);
}

/**
 * 处理删除图片请求
 */
/**
 * 处理删除图片请求
 * 统一封装删除图片的所有操作，包括云存储删除、缓存更新和数据库更新
 * @param {Object} req - HTTP请求对象
 * @param {Object} res - HTTP响应对象
 */
async function handleDeleteImage(req, res) {
  const { fileName } = req.query;
  
  // 验证文件名
  if (!fileName) {
    return res.status(400).json({ error: '缺少文件名参数' });
  }
  
  console.log(`开始删除图片: ${fileName}`);
  const startTime = Date.now();
  const operations = {
    cloud: { success: false, time: 0 },
    cache: { success: false, time: 0 },
    database: { success: false, time: 0 }
  };
  
  try {
    // 1. 删除云存储中的图片
    const cloudStartTime = Date.now();
    try {
      const cloudResult = await deleteImage(fileName);
      operations.cloud.success = true;
      operations.cloud.time = Date.now() - cloudStartTime;
      console.log(`云存储中的图片删除成功，耗时: ${operations.cloud.time}ms`);
    } catch (cloudError) {
      operations.cloud.time = Date.now() - cloudStartTime;
      console.error(`云存储中的图片删除失败，耗时: ${operations.cloud.time}ms:`, cloudError);
      throw new Error(`云存储删除失败: ${cloudError.message}`);
    }
    
    // 2. 从缓存中删除图片
    const cacheStartTime = Date.now();
    try {
      const cacheResult = await removeImageFromCache(fileName);
      operations.cache.success = true;
      operations.cache.time = Date.now() - cacheStartTime;
      console.log(`缓存中的图片删除结果: ${cacheResult ? '成功' : '未找到'}, ID: ${fileName}, 耗时: ${operations.cache.time}ms`);
    } catch (cacheError) {
      operations.cache.time = Date.now() - cacheStartTime;
      console.warn(`缓存中的图片删除失败，耗时: ${operations.cache.time}ms:`, cacheError);
      // 缓存删除失败不应该中断整个流程，继续执行后续操作
    }
    
    // 3. 从 Supabase 数据库中删除图片记录
    const dbStartTime = Date.now();
    try {
      const supabaseResult = await deleteImageFromSupabase(fileName);
      operations.database.success = true;
      operations.database.time = Date.now() - dbStartTime;
      console.log(`Supabase 数据库中的图片删除成功，耗时: ${operations.database.time}ms`);
    } catch (supabaseError) {
      operations.database.time = Date.now() - dbStartTime;
      console.warn(`Supabase 数据库中的图片删除失败，耗时: ${operations.database.time}ms:`, supabaseError);
      // 数据库删除失败不应该中断整个流程
    }
    
    // 计算总耗时
    const totalTime = Date.now() - startTime;
    console.log(`服务器端删除图片完成: ${fileName}，总耗时: ${totalTime}ms，详细指标:`, operations);
    
    // 返回成功响应，包含各操作的状态
    return res.status(200).json({
      success: true,
      message: `成功删除图片: ${fileName}`,
      imageId: fileName, // 返回图片ID，便于前端删除本地数据库记录
      operations,
      totalTime
    });
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`删除图片失败: ${fileName}，总耗时: ${totalTime}ms:`, error);
    return res.status(500).json({ 
      error: `删除图片失败: ${error.message}`,
      operations,
      totalTime
    });
  }
}

/**
 * 处理获取存储使用情况请求
 */
async function handleGetUsage(req, res) {
  const usage = await getBucketUsage();
  
  // 设置响应头
  res.setHeader('X-Total-Objects', usage.objectCount);
  res.setHeader('X-Total-Size', usage.totalSize);
  res.setHeader('X-Total-Size-MB', usage.totalSizeMB);
  res.setHeader('X-Last-Updated', usage.lastUpdated);
  
  return res.status(200).end();
}
