/**
 * 图片上传 API 路由
 * 处理图片上传到 Cloudflare R2 存储
 */

import { uploadImage } from '../../lib/cloudflare';
import { addImageToCache } from '../../lib/cacheManager';
import { normalizeImageData } from '../../lib/imageDataModel';
import { syncImageMetadataToSupabase } from '../../lib/supabaseService';
import fs from 'fs';
import { IncomingForm } from 'formidable';

// 配置 API 路由不解析请求体，我们将使用 formidable 手动解析
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * 处理图片上传请求
 * 支持两种上传方式：
 * 1. Base64 编码的图片数据
 * 2. 表单文件上传
 */
/**
 * 将上传的图片添加到缓存并同步到Supabase
 * 包含重试机制和错误处理
 * @param {Object} result - 上传图片的结果对象
 */
async function addImageToCacheWithRetry(result) {
  try {
    // 使用标准化的图片数据模型 - 只保留imageUrl属性
    const imageForCache = normalizeImageData({
      id: result.fileName,
      imageUrl: result.url, // 只使用imageUrl属性
      prompt: result.metadata.prompt || '',
      createdAt: result.metadata.createdAt || new Date().toISOString(),
      ...result.metadata
    });
    
    // 添加Redis缓存更新的重试机制
    let cacheSuccess = false;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (!cacheSuccess && retryCount < maxRetries) {
      try {
        console.log(`尝试将图片添加到Redis缓存 [尝试${retryCount + 1}/${maxRetries}]: ${imageForCache.id}`);
        await addImageToCache(imageForCache);
        cacheSuccess = true;
        console.log(`新上传的图片已成功添加到Redis缓存: ${imageForCache.id}`);
      } catch (err) {
        retryCount++;
        if (retryCount < maxRetries) {
          console.warn(`Redis缓存更新失败，准备重试 ${retryCount}/${maxRetries}: ${err.message}`);
          // 等待一小段时间再重试
          await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
        } else {
          console.error(`添加图片到Redis缓存失败，已达到最大重试次数: ${err.message}`);
          throw err; // 重新抛出错误，让外层catch捕获
        }
      }
    }
    
    // 同步到 Supabase 数据库
    try {
      await syncImageMetadataToSupabase(imageForCache);
      console.log(`新上传的图片已同步到 Supabase 数据库: ${imageForCache.id}`);
    } catch (supabaseError) {
      console.warn(`同步图片到 Supabase 数据库失败: ${supabaseError.message}`);
    }
  } catch (cacheError) {
    console.error(`添加图片到缓存失败: ${cacheError.message}`);
  }
}

export default async function handler(req, res) {
  try {
    // 只允许 POST 请求
    if (req.method !== 'POST') {
      return res.status(405).json({ error: '方法不允许' });
    }

    // 根据 Content-Type 判断上传方式
    const contentType = req.headers['content-type'] || '';

    // 处理 JSON 请求（Base64 编码的图片数据）
    if (contentType.includes('application/json')) {
      // 手动解析 JSON 请求体
      const jsonData = await new Promise((resolve, reject) => {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            resolve(data);
          } catch (error) {
            reject(new Error('解析 JSON 请求失败'));
          }
        });
        req.on('error', reject);
      });
      
      const { imageUrl, prompt, metadata } = jsonData;

      // 验证必要参数
      if (!imageUrl) {
        return res.status(400).json({ error: '缺少图片数据' });
      }

      // 上传图片
      // 如果客户端提供了文件名，使用客户端的文件名保持一致性
      const fileName = metadata?.fileName || null;
      const result = await uploadImage(imageUrl, prompt || '', { ...metadata, fileName });
      
      // 将新上传的图片添加到缓存
      await addImageToCacheWithRetry(result);
      
      return res.status(200).json(result);
    }
    // 处理表单请求（文件上传）
    else if (contentType.includes('multipart/form-data')) {
      // 使用 formidable 解析表单
      const form = new IncomingForm({
        keepExtensions: true,
        maxFileSize: 10 * 1024 * 1024, // 10MB 限制
      });

      // 解析表单
      const formData = await new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) {
            reject(err);
            return;
          }
          resolve({ fields, files });
        });
      });

      const { fields, files } = formData;
      const prompt = fields.prompt?.[0] || '';
      const metadataStr = fields.metadata?.[0] || '{}';
      const metadata = JSON.parse(metadataStr);

      // 检查是否有文件上传
      if (!files.image || !files.image[0]) {
        return res.status(400).json({ error: '没有上传图片文件' });
      }

      const file = files.image[0];
      const fileData = fs.readFileSync(file.filepath);

      // 上传图片
      const result = await uploadImage(fileData, prompt, metadata);

      // 将新上传的图片添加到缓存
      await addImageToCacheWithRetry(result);

      // 删除临时文件
      fs.unlinkSync(file.filepath);

      return res.status(200).json(result);
    } else {
      return res.status(400).json({ error: '不支持的内容类型' });
    }
  } catch (error) {
    console.error('上传图片失败:', error);
    return res.status(500).json({ error: `上传图片失败: ${error.message}` });
  }
}
