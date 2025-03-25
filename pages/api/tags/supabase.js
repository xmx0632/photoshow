/**
 * Supabase 标签 API 路由
 * 处理标签在 Supabase 数据库中的存储和检索
 */

import supabase from '../../../lib/supabase';

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
      case 'PUT':
        // 同步标签
        return await handleSyncTags(req, res);
      default:
        return res.status(405).json({ error: '方法不允许' });
    }
  } catch (error) {
    console.error('Supabase 标签操作失败:', error);
    return res.status(500).json({ error: `操作失败: ${error.message}` });
  }
}

/**
 * 处理获取所有标签请求
 */
async function handleGetTags(req, res) {
  try {
    // 从 Supabase 获取所有标签
    const { data, error } = await supabase
      .from('tags')
      .select('tag')
      .order('tag', { ascending: true });
    
    if (error) throw error;
    
    // 提取标签名称
    const tags = data.map(item => item.tag);
    
    return res.status(200).json({ tags });
  } catch (error) {
    console.error('获取 Supabase 标签失败:', error);
    return res.status(500).json({ error: `获取标签失败: ${error.message}` });
  }
}

/**
 * 处理添加标签请求
 */
async function handleAddTag(req, res) {
  try {
    const { imageId, tag } = req.body;
    
    // 验证必要参数
    if (!imageId || !tag) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    // 检查标签是否已存在
    const { data: existingTag, error: checkError } = await supabase
      .from('tags')
      .select('id')
      .eq('tag', tag)
      .single();
    
    let tagId;
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 是 "未找到结果" 错误
      throw checkError;
    }
    
    // 如果标签不存在，创建新标签
    if (!existingTag) {
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
    
    // 添加图片-标签关联
    const { error: relationError } = await supabase
      .from('image_tags')
      .insert({
        image_id: imageId,
        tag_id: tagId
      });
    
    if (relationError) {
      // 如果是唯一约束错误（标签已添加到图片），返回成功
      if (relationError.code === '23505') {
        return res.status(200).json({ success: true, message: '标签已存在于图片' });
      }
      throw relationError;
    }
    
    // 同时更新本地元数据
    // 这里可以调用本地的标签添加函数
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('添加 Supabase 标签失败:', error);
    return res.status(500).json({ error: `添加标签失败: ${error.message}` });
  }
}

/**
 * 处理删除标签请求
 */
async function handleRemoveTag(req, res) {
  try {
    const { imageId, tag } = req.body;
    
    // 验证必要参数
    if (!imageId || !tag) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    // 获取标签 ID
    const { data: tagData, error: tagError } = await supabase
      .from('tags')
      .select('id')
      .eq('tag', tag)
      .single();
    
    if (tagError) throw tagError;
    
    // 删除图片-标签关联
    const { error: deleteError } = await supabase
      .from('image_tags')
      .delete()
      .eq('image_id', imageId)
      .eq('tag_id', tagData.id);
    
    if (deleteError) throw deleteError;
    
    // 同时更新本地元数据
    // 这里可以调用本地的标签删除函数
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('删除 Supabase 标签失败:', error);
    return res.status(500).json({ error: `删除标签失败: ${error.message}` });
  }
}

/**
 * 同步本地标签到 Supabase
 */
async function handleSyncTags(req, res) {
  try {
    const { tags } = req.body;
    
    if (!tags || !Array.isArray(tags)) {
      return res.status(400).json({ error: '无效的标签数据' });
    }
    
    // 获取所有现有标签
    const { data: existingTags, error: fetchError } = await supabase
      .from('tags')
      .select('tag');
    
    if (fetchError) throw fetchError;
    
    const existingTagNames = existingTags.map(t => t.tag);
    const newTags = tags.filter(tag => !existingTagNames.includes(tag));
    
    // 批量插入新标签
    if (newTags.length > 0) {
      const tagsToInsert = newTags.map(tag => ({ tag }));
      const { error: insertError } = await supabase
        .from('tags')
        .insert(tagsToInsert);
      
      if (insertError) throw insertError;
    }
    
    return res.status(200).json({ 
      success: true, 
      synced: newTags.length,
      total: tags.length
    });
  } catch (error) {
    console.error('同步 Supabase 标签失败:', error);
    return res.status(500).json({ error: `同步标签失败: ${error.message}` });
  }
}
