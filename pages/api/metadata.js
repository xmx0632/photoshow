/**
 * 图片元数据 API 路由
 * 重定向到 Supabase 相关 API，不再使用本地 metadata.json
 */

import supabase from '../../lib/supabase';

export default async function handler(req, res) {
  try {
    // 根据请求方法处理不同操作
    switch (req.method) {
      case 'GET':
        // 获取元数据
        return await handleGetMetadata(req, res);
      case 'POST':
        // 保存元数据
        return await handleSaveMetadata(req, res);
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
async function handleGetMetadata(req, res) {
  const { id } = req.query;
  
  if (id) {
    // 从 Supabase 获取指定 ID 的元数据
    const { data, error } = await supabase
      .from('images')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error('获取元数据失败:', error);
      return res.status(404).json({ error: '元数据不存在' });
    }
    
    return res.status(200).json({ metadata: data });
  } else {
    // 从 Supabase 获取所有元数据
    const { data, error } = await supabase
      .from('images')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('获取元数据失败:', error);
      return res.status(500).json({ error: '获取元数据失败' });
    }
    
    return res.status(200).json({ metadata: data });
  }
}

/**
 * 处理保存元数据请求
 */
async function handleSaveMetadata(req, res) {
  const { metadata } = req.body;
  
  // 验证必要参数
  if (!metadata || !metadata.id) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  
  // 检查是否已存在
  const { data: existingData, error: checkError } = await supabase
    .from('images')
    .select('id')
    .eq('id', metadata.id)
    .single();
  
  let result;
  
  if (!existingData) {
    // 插入新记录
    result = await supabase
      .from('images')
      .insert({
        id: metadata.id,
        url: metadata.url,
        prompt: metadata.prompt,
        created_at: metadata.createdAt || new Date().toISOString()
      });
  } else {
    // 更新现有记录
    result = await supabase
      .from('images')
      .update({
        url: metadata.url,
        prompt: metadata.prompt,
        updated_at: new Date().toISOString()
      })
      .eq('id', metadata.id);
  }
  
  if (result.error) {
    console.error('保存元数据失败:', result.error);
    return res.status(500).json({ error: `保存元数据失败: ${result.error.message}` });
  }
  
  return res.status(200).json({ success: true, message: '元数据保存成功' });
}
