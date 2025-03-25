/**
 * 标签管理 API 路由 (仅使用 Supabase)
 * 处理标签的获取、添加和删除操作，所有数据直接存储在 Supabase 中
 */

import supabase from '../../lib/supabase';

// 标签缓存机制
let tagsCache = null;
let tagsCacheTime = null;
const CACHE_TTL = 5 * 60 * 1000; // 缓存时间5分钟

export default async function handler(req, res) {
  try {
    // 根据请求方法处理不同操作
    switch (req.method) {
      case 'GET':
        // 获取所有标签
        return await handleGetTags(req, res);
      case 'POST':
        // 添加标签
        return await handleAddTag(req, res);
      case 'DELETE':
        // 删除标签
        return await handleRemoveTag(req, res);
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
async function handleGetTags(req, res) {
  try {
    // 添加缓存控制头，客户端缓存30秒
    res.setHeader('Cache-Control', 'public, max-age=30');
    
    // 如果缓存存在且未过期，直接返回缓存数据
    if (tagsCache && tagsCacheTime && (Date.now() - tagsCacheTime < CACHE_TTL)) {
      console.log('使用标签缓存，跳过 Supabase 请求');
      return res.status(200).json({ tags: tagsCache });
    }
    
    console.log('标签缓存过期或不存在，从 Supabase 获取数据');
    
    // 从 Supabase 获取所有标签
    const { data, error } = await supabase
      .from('tags')
      .select('tag')
      .order('tag', { ascending: true });
    
    if (error) throw error;
    
    // 提取标签名称
    const tags = data.map(item => item.tag);
    
    // 更新缓存
    tagsCache = tags;
    tagsCacheTime = Date.now();
    console.log(`标签缓存已更新，共 ${tags.length} 个标签`);
    
    return res.status(200).json({ tags });
  } catch (error) {
    console.error('获取标签失败:', error);
    return res.status(500).json({ error: `获取标签失败: ${error.message}` });
  }
}

/**
 * 处理添加标签请求
 */
async function handleAddTag(req, res) {
  const { imageId, tag } = req.body;
  
  // 验证必要参数
  if (!imageId || !tag) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  
  // 添加标签时清除缓存，确保下次获取时能看到新标签
  tagsCache = null;
  tagsCacheTime = null;
  
  try {
    // 1. 检查标签是否存在，不存在则创建
    const { data: existingTag, error: checkError } = await supabase
      .from('tags')
      .select('id')
      .eq('tag', tag)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 是 "未找到结果" 错误
      throw checkError;
    }
    
    let tagId;
    
    if (!existingTag) {
      // 创建新标签
      const { data: newTag, error: insertError } = await supabase
        .from('tags')
        .insert({ tag })
        .select('id')
        .single();
      
      if (insertError) throw insertError;
      tagId = newTag.id;
    } else {
      tagId = existingTag.id;
    }
    
    // 2. 检查图片-标签关联是否已存在
    const { data: existingRelation, error: relationCheckError } = await supabase
      .from('image_tags')
      .select('id')
      .eq('image_id', imageId)
      .eq('tag_id', tagId)
      .single();
    
    if (relationCheckError && relationCheckError.code !== 'PGRST116') {
      throw relationCheckError;
    }
    
    // 如果关联不存在，创建关联
    if (!existingRelation) {
      const { error: relationError } = await supabase
        .from('image_tags')
        .insert({ image_id: imageId, tag_id: tagId });
      
      if (relationError) throw relationError;
    }
    
    return res.status(200).json({ 
      success: true, 
      message: '标签添加成功',
      imageId,
      tag
    });
  } catch (error) {
    console.error('添加标签失败:', error);
    return res.status(500).json({ error: `添加标签失败: ${error.message}` });
  }
}

/**
 * 处理删除标签请求
 */
async function handleRemoveTag(req, res) {
  const { imageId, tag } = req.body;
  
  // 验证必要参数
  if (!imageId || !tag) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  
  // 删除标签时清除缓存，确保下次获取时能反映变化
  tagsCache = null;
  tagsCacheTime = null;
  
  try {
    // 1. 获取标签 ID
    const { data: tagData, error: tagError } = await supabase
      .from('tags')
      .select('id')
      .eq('tag', tag)
      .single();
    
    if (tagError) throw tagError;
    
    if (!tagData) {
      return res.status(404).json({ error: '标签不存在' });
    }
    
    // 2. 删除图片-标签关联
    const { error: deleteError } = await supabase
      .from('image_tags')
      .delete()
      .eq('image_id', imageId)
      .eq('tag_id', tagData.id);
    
    if (deleteError) throw deleteError;
    
    return res.status(200).json({ 
      success: true, 
      message: '标签移除成功',
      imageId,
      tag
    });
  } catch (error) {
    console.error('移除标签失败:', error);
    return res.status(500).json({ error: `移除标签失败: ${error.message}` });
  }
}
