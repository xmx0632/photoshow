/**
 * 图片上传 API 路由
 * 处理图片上传到 Cloudflare R2 存储
 */

import { uploadImage } from '../../lib/cloudflare';
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
      const { imageData, prompt, metadata } = req.body;

      // 验证必要参数
      if (!imageData) {
        return res.status(400).json({ error: '缺少图片数据' });
      }

      // 上传图片
      const result = await uploadImage(imageData, prompt || '', metadata || {});
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
