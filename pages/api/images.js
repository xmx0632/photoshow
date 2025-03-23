/**
 * 图片管理 API 路由
 * 处理图片列表获取、删除等操作
 */

import { listImages, deleteImage, getBucketUsage } from '../../lib/cloudflare';

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
  
  // 删除图片
  const result = await deleteImage(fileName);
  return res.status(200).json(result);
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
