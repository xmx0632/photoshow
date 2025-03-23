/**
 * Cloudflare R2 存储服务配置和工具函数
 * 用于图片上传、存储和管理
 */

import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

// 仅在服务器端运行
let fs = null;
if (typeof window === 'undefined') {
  fs = require('fs');
}

// 从环境变量获取 Cloudflare R2 配置
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const accessKeyId = process.env.CLOUDFLARE_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUDFLARE_SECRET_ACCESS_KEY;
const bucketName = process.env.CLOUDFLARE_BUCKET_NAME || 'photoshow';
const bucketRegion = process.env.CLOUDFLARE_BUCKET_REGION || 'auto';

// 创建 S3 客户端（R2 兼容 S3 API）
let s3Client = null;

/**
 * 初始化 S3 客户端
 * @returns {S3Client} S3 客户端实例
 */
export function getS3Client() {
  // 如果已经初始化，直接返回
  if (s3Client) return s3Client;
  
  // 检查必要的环境变量
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('缺少 Cloudflare R2 配置，请在环境变量中设置 CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_ACCESS_KEY_ID 和 CLOUDFLARE_SECRET_ACCESS_KEY');
  }
  
  // 初始化 S3 客户端
  s3Client = new S3Client({
    region: bucketRegion,
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
  
  return s3Client;
}

/**
 * 上传图片到 R2 存储
 * @param {Buffer|Blob|string} imageData - 图片数据，可以是 Buffer、Blob 或 Base64 字符串
 * @param {string} prompt - 生成图片的提示词
 * @param {Object} metadata - 附加的元数据
 * @returns {Promise<Object>} 上传结果，包含图片 URL 和元数据
 */
export async function uploadImage(imageData, prompt, metadata = {}) {
  try {
    // 确保在服务器端运行
    if (typeof window !== 'undefined') {
      throw new Error('uploadImage 只能在服务器端使用');
    }
    
    // 获取 S3 客户端
    const client = getS3Client();
    
    // 生成唯一文件名
    const timestamp = Date.now();
    const uuid = uuidv4();
    const fileExtension = 'png'; // 默认为 PNG
    const fileName = `${timestamp}-${uuid}.${fileExtension}`;
    
    // 处理图片数据
    let buffer;
    if (typeof imageData === 'string' && imageData.startsWith('data:')) {
      // 处理 Base64 数据 URL
      const base64Data = imageData.split(',')[1];
      buffer = Buffer.from(base64Data, 'base64');
    } else if (typeof imageData === 'string') {
      // 处理纯 Base64 字符串
      buffer = Buffer.from(imageData, 'base64');
    } else if (Buffer.isBuffer(imageData)) {
      // 已经是 Buffer
      buffer = imageData;
    } else {
      throw new Error('不支持的图片数据格式');
    }
    
    // 准备元数据
    const imageMetadata = {
      prompt,
      createdAt: new Date().toISOString(),
      ...metadata,
    };
    
    // 上传到 R2
    const uploadParams = {
      Bucket: bucketName,
      Key: fileName,
      Body: buffer,
      ContentType: `image/${fileExtension}`,
      Metadata: {
        prompt: encodeURIComponent(prompt),
        createdAt: new Date().toISOString(),
        ...Object.fromEntries(
          Object.entries(metadata).map(([key, value]) => [key, encodeURIComponent(String(value))])
        ),
      },
    };
    
    // 执行上传
    const uploadCommand = new PutObjectCommand(uploadParams);
    await client.send(uploadCommand);
    
    // 生成预签名 URL（有效期 7 天）
    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: fileName,
    });
    
    const signedUrl = await getSignedUrl(client, getCommand, { expiresIn: 604800 }); // 7 天
    
    // 返回上传结果
    return {
      success: true,
      fileName,
      url: signedUrl,
      publicUrl: `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${fileName}`,
      metadata: imageMetadata,
    };
  } catch (error) {
    console.error('上传图片到 R2 失败:', error);
    throw new Error(`上传图片失败: ${error.message}`);
  }
}

/**
 * 获取存储桶中的所有图片
 * @param {number} limit - 限制返回的图片数量
 * @param {string} continuationToken - 用于分页的标记
 * @returns {Promise<Object>} 图片列表和分页信息
 */
export async function listImages(limit = 100, continuationToken = null) {
  try {
    // 获取 S3 客户端
    const client = getS3Client();
    
    // 准备列表参数
    const listParams = {
      Bucket: bucketName,
      MaxKeys: limit,
    };
    
    // 添加分页标记（如果有）
    if (continuationToken) {
      listParams.ContinuationToken = continuationToken;
    }
    
    // 执行列表请求
    const command = new ListObjectsV2Command(listParams);
    const response = await client.send(command);
    
    // 处理结果
    const images = [];
    
    // 为每个对象生成预签名 URL
    for (const item of response.Contents || []) {
      const getCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: item.Key,
      });
      
      const signedUrl = await getSignedUrl(client, getCommand, { expiresIn: 86400 }); // 1 天
      
      // 获取对象的元数据
      const headCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: item.Key,
      });
      
      const objectData = await client.send(headCommand);
      
      // 解析元数据
      const metadata = objectData.Metadata || {};
      const parsedMetadata = {};
      
      // 解码元数据
      for (const [key, value] of Object.entries(metadata)) {
        try {
          parsedMetadata[key] = decodeURIComponent(value);
        } catch (e) {
          parsedMetadata[key] = value;
        }
      }
      
      // 添加到结果列表
      images.push({
        key: item.Key,
        url: signedUrl,
        publicUrl: `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${item.Key}`,
        size: item.Size,
        lastModified: item.LastModified,
        metadata: parsedMetadata,
      });
    }
    
    // 返回结果
    return {
      images,
      nextContinuationToken: response.NextContinuationToken,
      isTruncated: response.IsTruncated,
      count: images.length,
      totalCount: response.KeyCount,
    };
  } catch (error) {
    console.error('获取图片列表失败:', error);
    throw new Error(`获取图片列表失败: ${error.message}`);
  }
}

/**
 * 删除 R2 中的图片
 * @param {string} fileName - 要删除的文件名
 * @returns {Promise<Object>} 删除结果
 */
export async function deleteImage(fileName) {
  try {
    // 获取 S3 客户端
    const client = getS3Client();
    
    // 执行删除
    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: fileName,
    });
    
    await client.send(deleteCommand);
    
    return {
      success: true,
      message: `成功删除图片: ${fileName}`,
    };
  } catch (error) {
    console.error('删除图片失败:', error);
    throw new Error(`删除图片失败: ${error.message}`);
  }
}

/**
 * 获取存储桶使用情况
 * @returns {Promise<Object>} 存储使用情况
 */
export async function getBucketUsage() {
  try {
    // 获取 S3 客户端
    const client = getS3Client();
    
    // 获取所有对象
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
    });
    
    const response = await client.send(listCommand);
    
    // 计算总存储大小
    let totalSize = 0;
    const objects = response.Contents || [];
    
    for (const obj of objects) {
      totalSize += obj.Size;
    }
    
    // 返回使用情况
    return {
      objectCount: objects.length,
      totalSize,
      totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('获取存储使用情况失败:', error);
    throw new Error(`获取存储使用情况失败: ${error.message}`);
  }
}

/**
 * 从 Base64 数据 URL 创建图片文件
 * @param {string} dataUrl - Base64 数据 URL
 * @param {string} outputPath - 输出文件路径
 * @returns {Promise<string>} 文件路径
 */
export function saveBase64Image(dataUrl, outputPath) {
  // 确保在服务器端运行
  if (typeof window !== 'undefined' || !fs) {
    throw new Error('saveBase64Image 只能在服务器端使用');
  }
  
  return new Promise((resolve, reject) => {
    try {
      // 提取 Base64 数据
      const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      
      if (!matches || matches.length !== 3) {
        throw new Error('无效的 Base64 数据 URL');
      }
      
      // 提取 MIME 类型和 Base64 数据
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');
      
      // 确保目录存在
      const dir = outputPath.substring(0, outputPath.lastIndexOf('/'));
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // 写入文件
      fs.writeFileSync(outputPath, buffer);
      
      resolve(outputPath);
    } catch (error) {
      reject(error);
    }
  });
}
