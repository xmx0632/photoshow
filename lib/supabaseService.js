/**
 * Supabase 服务工具
 * 提供与 Supabase 数据库交互的功能
 */

import supabase from './supabase';

/**
 * 从 Supabase 数据库中删除图片记录
 * @param {string} imageId - 要删除的图片 ID
 * @returns {Promise<Object>} 删除结果
 */
export async function deleteImageFromSupabase(imageId) {
  try {
    console.log(`开始从 Supabase 删除图片记录: ${imageId}`);
    
    // 首先删除图片-标签关联
    const { error: relationError } = await supabase
      .from('image_tags')
      .delete()
      .eq('image_id', imageId);
      
    if (relationError) {
      console.warn(`删除图片-标签关联失败: ${relationError.message}`);
    }
    
    // 然后删除图片记录
    const { data, error } = await supabase
      .from('images')
      .delete()
      .eq('id', imageId)
      .select();
      
    if (error) {
      throw error;
    }
    
    console.log(`成功从 Supabase 删除图片记录: ${imageId}`);
    return { success: true, imageId, message: `成功从 Supabase 删除图片: ${imageId}` };
  } catch (error) {
    console.error(`从 Supabase 删除图片失败: ${imageId}`, error);
    return { success: false, imageId, error: error.message };
  }
}
// fs 和 path 模块只在服务器端使用，不在客户端导入

/**
 * 同步标签到 Supabase
 * @param {Array} tags - 要同步的标签数组
 * @returns {Promise<Object>} 同步结果
 */
export async function syncTagsToSupabase(tags) {
  try {
    const response = await fetch('/api/tags/supabase', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tags }),
    });
    
    if (!response.ok) {
      throw new Error(`同步标签失败: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('同步标签到 Supabase 失败:', error);
    throw error;
  }
}

/**
 * 从 Supabase 获取所有标签
 * @returns {Promise<Array>} 标签数组
 */
export async function getTagsFromSupabase() {
  try {
    const response = await fetch('/api/tags/supabase');
    
    if (!response.ok) {
      throw new Error(`获取标签失败: ${response.status}`);
    }
    
    const data = await response.json();
    return data.tags || [];
  } catch (error) {
    console.error('从 Supabase 获取标签失败:', error);
    throw error;
  }
}

/**
 * 添加标签到 Supabase
 * @param {string} imageId - 图片 ID
 * @param {string} tag - 标签
 * @returns {Promise<Object>} 添加结果
 */
export async function addTagToSupabase(imageId, tag) {
  try {
    const response = await fetch('/api/tags/supabase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageId, tag }),
    });
    
    if (!response.ok) {
      throw new Error(`添加标签失败: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('添加标签到 Supabase 失败:', error);
    throw error;
  }
}

/**
 * 从 Supabase 删除标签
 * @param {string} imageId - 图片 ID
 * @param {string} tag - 标签
 * @returns {Promise<Object>} 删除结果
 */
export async function removeTagFromSupabase(imageId, tag) {
  try {
    const response = await fetch('/api/tags/supabase', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageId, tag }),
    });
    
    if (!response.ok) {
      throw new Error(`删除标签失败: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('从 Supabase 删除标签失败:', error);
    throw error;
  }
}

/**
 * 同步图片元数据到 Supabase
 * @param {Object} metadata - 图片元数据
 * @returns {Promise<Object>} 同步结果
 */
export async function syncImageMetadataToSupabase(metadata) {
  try {
    const { data, error } = await supabase
      .from('images')
      .upsert({
        id: metadata.id,
        url: metadata.url,
        prompt: metadata.prompt,
        updated_at: new Date().toISOString()
      })
      .select();
    
    if (error) throw error;
    
    // 如果有标签，同步标签
    if (metadata.tags && Array.isArray(metadata.tags) && metadata.tags.length > 0) {
      // 先同步所有标签
      await syncTagsToSupabase(metadata.tags);
      
      // 然后为图片添加标签关联
      for (const tag of metadata.tags) {
        await addTagToSupabase(metadata.id, tag);
      }
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('同步图片元数据到 Supabase 失败:', error);
    throw error;
  }
}

/**
 * 同步所有图片列表数据到 Supabase
 * 从缓存 API 获取图片数据，不再使用本地 metadata.json 文件
 * @returns {Promise<Object>} 同步结果
 */
export async function syncAllImagesToSupabase() {
  try {
    // 从缓存 API 获取图片数据
    // 在服务器端环境中，需要使用绝对路径
    let cacheUrl;
    if (typeof window === 'undefined') {
      // 服务器端环境
      const fs = require('fs');
      const path = require('path');
      
      // 直接读取缓存文件
      try {
        const cachePath = path.join(process.cwd(), 'data', 'cache.json');
        if (fs.existsSync(cachePath)) {
          const fileContent = fs.readFileSync(cachePath, 'utf8');
          const cacheData = JSON.parse(fileContent);
          console.log(`从缓存文件中获取到 ${cacheData.images?.length || 0} 张图片，准备同步到 Supabase...`);
          return syncImagesArrayToSupabase(cacheData.images || []);
        } else {
          console.log('缓存文件不存在，无法获取图片数据');
          return { total: 0, succeeded: 0, failed: 0 };
        }
      } catch (fsError) {
        console.error('读取缓存文件失败:', fsError);
        throw fsError;
      }
    } else {
      // 客户端环境
      const response = await fetch('/api/cache');
      if (!response.ok) {
        throw new Error(`获取图片缓存数据失败: ${response.status}`);
      }
      
      const data = await response.json();
      const images = data.images || [];
      
      console.log(`从缓存中获取到 ${images.length} 张图片，准备同步到 Supabase...`);
      
      // 调用同步函数处理图片数组
      return syncImagesArrayToSupabase(images);
    }
  } catch (error) {
    console.error('同步图片列表到 Supabase 失败:', error);
    throw error;
  }
}

/**
 * 同步图片数组到 Supabase
 * @param {Array} images - 图片元数据数组
 * @returns {Promise<Object>} 同步结果
 */
async function syncImagesArrayToSupabase(images) {
  try {
    console.log(`开始同步 ${images.length} 张图片到 Supabase...`);
    
    // 收集所有标签
    const allTags = new Set();
    images.forEach(img => {
      if (img.tags && Array.isArray(img.tags)) {
        img.tags.forEach(tag => allTags.add(tag));
      }
    });
    
    // 先同步所有标签
    if (allTags.size > 0) {
      await syncTagsToSupabase([...allTags]);
      console.log(`同步了 ${allTags.size} 个标签到 Supabase`);
    }
    
    // 然后同步图片数据
    const results = [];
    for (const img of images) {
      try {
        // 准备图片数据
        const imageData = {
          id: img.id,
          url: img.url,
          prompt: img.prompt || '',
          created_at: img.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // 插入或更新图片数据
        const { data, error } = await supabase
          .from('images')
          .upsert(imageData)
          .select();
        
        if (error) throw error;
        
        // 如果有标签，添加图片-标签关联
        if (img.tags && Array.isArray(img.tags) && img.tags.length > 0) {
          for (const tag of img.tags) {
            await addTagToSupabase(img.id, tag);
          }
        }
        
        results.push({ id: img.id, success: true });
      } catch (imgError) {
        console.error(`同步图片 ${img.id} 失败:`, imgError);
        results.push({ id: img.id, success: false, error: imgError.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`同步完成: ${successCount}/${images.length} 张图片成功同步到 Supabase`);
    
    return { 
      success: true, 
      total: images.length, 
      succeeded: successCount, 
      failed: images.length - successCount,
      results
    };
  } catch (error) {
    console.error('同步图片数组到 Supabase 失败:', error);
    throw error;
  }
}
