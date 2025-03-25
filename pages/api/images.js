/**
 * 图片管理 API 路由
 * 处理图片列表获取、删除等操作
 */

import { listImages, deleteImage, getBucketUsage } from '../../lib/cloudflare';
import { removeImageFromCache } from '../../lib/cacheManager';
import { normalizeImageArray } from '../../lib/imageDataModel';

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
async function handleDeleteImage(req, res) {
  const { fileName } = req.query;
  
  // 验证文件名
  if (!fileName) {
    return res.status(400).json({ error: '缺少文件名参数' });
  }
  
  try {
    // 删除云存储中的图片
    const cloudResult = await deleteImage(fileName);
    
    // 从缓存中删除图片
    try {
      await removeImageFromCache(fileName);
      console.log(`缓存中的图片删除成功: ${fileName}`);
    } catch (cacheError) {
      console.warn(`缓存中的图片删除失败: ${cacheError.message}`);
    }
    
    // 尝试删除本地 IndexedDB 中的图片
    try {
      // 导入 IndexedDB 删除函数
      const { deleteImage: deleteLocalImage } = require('../../lib/indexedDB');
      // 尝试删除本地图片，使用相同的 ID
      await deleteLocalImage(fileName);
      console.log(`本地图片删除成功: ${fileName}`);
    } catch (localError) {
      // 即使本地删除失败也不影响云存储删除结果
      console.warn(`本地图片删除失败: ${localError.message}`);
    }
    
    return res.status(200).json({
      ...cloudResult,
      message: `成功删除图片: ${fileName}`,
    });
  } catch (error) {
    console.error('删除图片失败:', error);
    return res.status(500).json({ error: `删除图片失败: ${error.message}` });
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
