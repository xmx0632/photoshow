/**
 * 图片元数据 API 路由
 * 处理元数据的获取和保存操作
 */

import { getAllMetadata, saveMetadata, getMetadataById } from '../../lib/metadata';

export default async function handler(req, res) {
  try {
    // 根据请求方法处理不同操作
    switch (req.method) {
      case 'GET':
        // 获取元数据
        return handleGetMetadata(req, res);
      case 'POST':
        // 保存元数据
        return handleSaveMetadata(req, res);
      default:
        return res.status(405).json({ error: '方法不允许' });
    }
  } catch (error) {
    console.error('元数据操作失败:', error);
    return res.status(500).json({ error: `操作失败: ${error.message}` });
  }
}

/**
 * 处理获取元数据请求
 */
function handleGetMetadata(req, res) {
  const { id } = req.query;
  
  if (id) {
    // 获取指定 ID 的元数据
    const metadata = getMetadataById(id);
    if (metadata) {
      return res.status(200).json({ metadata });
    } else {
      return res.status(404).json({ error: '元数据不存在' });
    }
  } else {
    // 获取所有元数据
    const allMetadata = getAllMetadata();
    return res.status(200).json({ metadata: allMetadata });
  }
}

/**
 * 处理保存元数据请求
 */
function handleSaveMetadata(req, res) {
  const { metadata } = req.body;
  
  // 验证必要参数
  if (!metadata || !metadata.id) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  
  // 保存元数据
  const success = saveMetadata(metadata);
  
  if (success) {
    return res.status(200).json({ success: true, message: '元数据保存成功' });
  } else {
    return res.status(500).json({ error: '保存元数据失败' });
  }
}
