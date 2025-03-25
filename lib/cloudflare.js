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
    
    // 使用客户端提供的文件名或生成新的文件名
    let fileName;
    if (metadata && metadata.fileName) {
      // 如果客户端提供了文件名，使用客户端的文件名
      fileName = metadata.fileName;
      // 如果客户端文件名没有扩展名，添加默认扩展名
      if (!fileName.includes('.')) {
        fileName = `${fileName}.${fileExtension}`;
      }
    } else {
      // 生成新的文件名
      fileName = `${timestamp}-${uuid}.${fileExtension}`;
    }
    
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
 * @returns {Promise<Array>} 图片数组
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
    
    // 如果没有内容，返回空数组
    if (!response.Contents || response.Contents.length === 0) {
      console.log('云存储中没有图片');
      return images;
    }
    
    // 为每个对象生成预签名 URL
    for (const item of response.Contents) {
      try {
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
      } catch (itemError) {
        console.warn(`处理图片 ${item.Key} 失败:`, itemError);
        // 继续处理下一个图片
      }
    }
    
    console.log(`从云存储获取到 ${images.length} 张图片`);
    // 直接返回图片数组，而不是包含图片数组的对象
    return images;
  } catch (error) {
    console.error('获取图片列表失败:', error);
    // 出错时返回空数组，而不是抛出异常
    return [];
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

// 存储使用情况缓存
// 缓存结构: { data: {...}, timestamp: Date, isRefreshing: boolean }
let bucketUsageCache = null;

// 从环境变量中获取缓存过期时间，默认 5 分钟
// STORAGE_CACHE_TTL 单位为秒
const CACHE_TTL = (parseInt(process.env.STORAGE_CACHE_TTL) || 5 * 60) * 1000;

/**
 * 获取存储桶使用情况
 * 优化版本：添加缓存机制，减少对 Cloudflare R2 的请求频率
 * @param {boolean} forceRefresh - 是否强制刷新缓存
 * @returns {Promise<Object>} 存储使用情况
 */
export async function getBucketUsage(forceRefresh = false) {
  const now = Date.now();
  
  // 检查缓存是否有效
  if (
    !forceRefresh && 
    bucketUsageCache && 
    bucketUsageCache.data && 
    bucketUsageCache.timestamp && 
    (now - bucketUsageCache.timestamp < CACHE_TTL)
  ) {
    console.log('使用缓存的存储使用情况数据，缓存时间：', 
      new Date(bucketUsageCache.timestamp).toISOString(), 
      '，距离现在：', 
      Math.round((now - bucketUsageCache.timestamp) / 1000), '秒');
    return { ...bucketUsageCache.data, fromCache: true };
  }
  
  // 如果正在刷新，等待并返回当前缓存
  if (bucketUsageCache && bucketUsageCache.isRefreshing) {
    console.log('存储使用情况正在刷新中，返回当前缓存数据');
    return { ...bucketUsageCache.data, fromCache: true, refreshing: true };
  }
  
  // 标记正在刷新
  if (bucketUsageCache) {
    bucketUsageCache.isRefreshing = true;
  } else {
    bucketUsageCache = { isRefreshing: true };
  }
  
  try {
    console.log('开始获取存储使用情况...');
    const startTime = Date.now();
    
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
    
    // 准备结果数据
    const usageData = {
      objectCount: objects.length,
      totalSize,
      totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
      lastUpdated: new Date().toISOString(),
      queryTime: Date.now() - startTime
    };
    
    // 更新缓存
    bucketUsageCache = {
      data: usageData,
      timestamp: now,
      isRefreshing: false
    };
    
    console.log(`获取存储使用情况成功，共 ${usageData.objectCount} 个对象，大小 ${usageData.totalSizeMB} MB，查询耗时 ${usageData.queryTime}ms`);
    
    return { ...usageData, fromCache: false };
  } catch (error) {
    // 重置刷新状态
    if (bucketUsageCache) {
      bucketUsageCache.isRefreshing = false;
    }
    
    console.error('获取存储使用情况失败:', error);
    
    // 如果有缓存，返回过期的缓存数据而不是失败
    if (bucketUsageCache && bucketUsageCache.data) {
      console.log('返回过期的缓存数据');
      return { ...bucketUsageCache.data, fromCache: true, expired: true, error: error.message };
    }
    
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
