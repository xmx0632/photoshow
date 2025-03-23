/**
 * 标签管理 API 路由
 * 处理标签的获取、添加和删除操作
 */

import { getAllTags, addTagToImage, removeTagFromImage } from '../../lib/metadata';

export default async function handler(req, res) {
  try {
    // 根据请求方法处理不同操作
    switch (req.method) {
      case 'GET':
        // 获取所有标签
        return handleGetTags(req, res);
      case 'POST':
        // 添加标签
        return handleAddTag(req, res);
      case 'DELETE':
        // 删除标签
        return handleRemoveTag(req, res);
      default:
        return res.status(405).json({ error: '方法不允许' });
    }
  } catch (error) {
    console.error('标签操作失败:', error);
    return res.status(500).json({ error: `操作失败: ${error.message}` });
  }
}

/**
 * 处理获取所有标签请求
 */
function handleGetTags(req, res) {
  const tags = getAllTags();
  return res.status(200).json({ tags });
}

/**
 * 处理添加标签请求
 */
function handleAddTag(req, res) {
  const { imageId, tag } = req.body;
  
  // 验证必要参数
  if (!imageId || !tag) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  
  // 添加标签
  const success = addTagToImage(imageId, tag);
  
  if (success) {
    return res.status(200).json({ success: true, message: '标签添加成功' });
  } else {
    return res.status(404).json({ error: '图片不存在或添加标签失败' });
  }
}

/**
 * 处理删除标签请求
 */
function handleRemoveTag(req, res) {
  const { imageId, tag } = req.body;
  
  // 验证必要参数
  if (!imageId || !tag) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  
  // 删除标签
  const success = removeTagFromImage(imageId, tag);
  
  if (success) {
    return res.status(200).json({ success: true, message: '标签删除成功' });
  } else {
    return res.status(404).json({ error: '图片不存在或删除标签失败' });
  }
}
