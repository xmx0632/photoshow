/**
 * Redis 图片缓存服务
 * 用于使用 Upstash Redis 维护图片列表的缓存，提高页面响应速度
 * 并确保 IndexedDB 和云存储上图片数据的一致性
 */

import { getCache, setCache, deleteCache, clearAllCache } from './redisClient';

// 缓存键常量
const CACHE_KEYS = {
  IMAGES: 'photoshow:images',
  LAST_UPDATED: 'photoshow:lastUpdated',
  IS_INITIALIZED: 'photoshow:isInitialized'
};

// 内存缓存（作为备份，当 Redis 不可用时使用）
let memoryCache = {
  images: [],
  lastUpdated: null,
  isInitialized: false
};

/**
 * 初始化缓存
 * @param {Array} images - 图片数组
 */
export const initCache = async (images) => {
  try {
    const timestamp = new Date().toISOString();
    
    // 更新 Redis 缓存
    await setCache(CACHE_KEYS.IMAGES, images);
    await setCache(CACHE_KEYS.LAST_UPDATED, timestamp);
    await setCache(CACHE_KEYS.IS_INITIALIZED, true);
    
    // 同时更新内存缓存作为备份
    memoryCache.images = images;
    memoryCache.lastUpdated = timestamp;
    memoryCache.isInitialized = true;
    
    console.log(`Redis 缓存已初始化，共 ${images.length} 张图片`);
  } catch (error) {
    console.error('初始化 Redis 缓存失败:', error);
    // 仅更新内存缓存
    memoryCache.images = images;
    memoryCache.lastUpdated = new Date().toISOString();
    memoryCache.isInitialized = true;
  }
};

/**
 * 获取缓存中的所有图片
 * @returns {Promise<Array>} 图片数组
 */
export const getCachedImages = async () => {
  try {
    // 尝试从 Redis 获取
    const images = await getCache(CACHE_KEYS.IMAGES);
    if (images) {
      return images;
    }
    
    // Redis 获取失败，返回内存缓存
    return memoryCache.images;
  } catch (error) {
    console.error('获取缓存图片失败:', error);
    return memoryCache.images;
  }
};

/**
 * 检查缓存是否已初始化
 * @returns {Promise<boolean>} 是否已初始化
 */
export const isCacheInitialized = async () => {
  try {
    // 尝试从 Redis 获取
    const isInitialized = await getCache(CACHE_KEYS.IS_INITIALIZED);
    return !!isInitialized;
  } catch (error) {
    console.error('检查缓存初始化状态失败:', error);
    return memoryCache.isInitialized;
  }
};

/**
 * 获取缓存最后更新时间
 * @returns {Promise<string>} 最后更新时间
 */
export const getLastUpdated = async () => {
  try {
    // 尝试从 Redis 获取
    const lastUpdated = await getCache(CACHE_KEYS.LAST_UPDATED);
    return lastUpdated;
  } catch (error) {
    console.error('获取缓存最后更新时间失败:', error);
    return memoryCache.lastUpdated;
  }
};

/**
 * 添加图片到缓存
 * @param {Object} image - 图片对象
 * @returns {Promise<boolean>} 是否成功添加到Redis缓存
 */
export const addImageToCache = async (image) => {
  // 验证图片对象是否有效
  if (!image || !image.id) {
    console.error('添加图片到缓存失败: 图片对象无效', image);
    return false;
  }
  
  try {
    console.log(`开始添加图片到Redis缓存: ${image.id}`);
    
    // 获取当前缓存的图片
    const images = await getCachedImages() || [];
    console.log(`当前Redis缓存中有 ${images.length} 张图片`);
    
    // 检查是否已存在相同 ID 的图片
    const existingIndex = images.findIndex(img => img && img.id === image.id);
    
    if (existingIndex !== -1) {
      // 如果存在，则更新
      console.log(`更新Redis缓存中已存在的图片: ${image.id}`);
      images[existingIndex] = image;
    } else {
      // 如果不存在，则添加
      console.log(`向Redis缓存添加新图片: ${image.id}`);
      images.push(image);
    }
    
    const timestamp = new Date().toISOString();
    
    // 更新 Redis 缓存
    console.log(`尝试将 ${images.length} 张图片写入 Redis 缓存，缓存键: ${CACHE_KEYS.IMAGES}`);
    
    // 打印部分图片数据作为调试信息
    if (images.length > 0) {
      const sampleImage = images[0];
      console.log(`第一张图片数据示例: id=${sampleImage.id}, prompt=${sampleImage.prompt.substring(0, 20)}...`);
    }
    
    const imagesResult = await setCache(CACHE_KEYS.IMAGES, images);
    const timestampResult = await setCache(CACHE_KEYS.LAST_UPDATED, timestamp);
    
    if (!imagesResult || !timestampResult) {
      console.error(`Redis 缓存更新失败: images=${imagesResult}, timestamp=${timestampResult}`);
      throw new Error('Redis缓存更新失败');
    }
    
    // 验证缓存是否写入成功
    try {
      const cachedImages = await getCache(CACHE_KEYS.IMAGES);
      if (cachedImages && Array.isArray(cachedImages)) {
        console.log(`验证缓存写入成功: 从 Redis 读取到 ${cachedImages.length} 张图片`);
      } else {
        console.warn('验证缓存失败: 无法从 Redis 读取图片数据');
      }
    } catch (verifyError) {
      console.error('验证缓存写入时出错:', verifyError);
    }
    
    console.log(`Redis缓存更新成功，现有 ${images.length} 张图片，最后更新时间: ${timestamp}`);
    
    // 同时更新内存缓存
    memoryCache.images = images;
    memoryCache.lastUpdated = timestamp;
    
    return true;
  } catch (error) {
    console.error(`添加图片到Redis缓存失败 [${image.id}]:`, error);
    
    // Redis 操作失败，仅更新内存缓存
    if (memoryCache.images) {
      const existingIndex = memoryCache.images.findIndex(img => img && img.id === image.id);
      
      if (existingIndex !== -1) {
        memoryCache.images[existingIndex] = image;
      } else {
        memoryCache.images.push(image);
      }
    } else {
      memoryCache.images = [image];
    }
    
    memoryCache.lastUpdated = new Date().toISOString();
    console.log(`内存缓存已更新，Redis缓存更新失败，图片ID: ${image.id}`);
    
    return false;
  }
};

/**
 * 从缓存中移除图片
 * @param {string} imageId - 图片 ID
 * @returns {Promise<boolean>} 是否成功移除
 */
export const removeImageFromCache = async (imageId) => {
  try {
    // 获取当前缓存的图片
    const images = await getCachedImages() || [];
    const initialLength = images.length;
    
    // 过滤掉要删除的图片
    const filteredImages = images.filter(img => img && img.id !== imageId);
    
    if (filteredImages.length !== initialLength) {
      const timestamp = new Date().toISOString();
      
      // 更新 Redis 缓存
      await setCache(CACHE_KEYS.IMAGES, filteredImages);
      await setCache(CACHE_KEYS.LAST_UPDATED, timestamp);
      
      // 同时更新内存缓存
      memoryCache.images = filteredImages;
      memoryCache.lastUpdated = timestamp;
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('从缓存中移除图片失败:', error);
    
    // Redis 操作失败，尝试从内存缓存中移除
    if (memoryCache.images) {
      const initialLength = memoryCache.images.length;
      memoryCache.images = memoryCache.images.filter(img => img && img.id !== imageId);
      
      if (memoryCache.images.length !== initialLength) {
        memoryCache.lastUpdated = new Date().toISOString();
        return true;
      }
    }
    
    return false;
  }
};

/**
 * 更新缓存中的图片
 * @param {string} imageId - 图片 ID
 * @param {Object} updateData - 更新数据
 * @returns {Promise<boolean>} 是否成功更新
 */
export const updateImageInCache = async (imageId, updateData) => {
  try {
    // 获取当前缓存的图片
    const images = await getCachedImages() || [];
    
    // 查找要更新的图片索引
    const imageIndex = images.findIndex(img => img.id === imageId);
    
    if (imageIndex !== -1) {
      // 更新图片数据
      images[imageIndex] = {
        ...images[imageIndex],
        ...updateData
      };
      
      const timestamp = new Date().toISOString();
      
      // 更新 Redis 缓存
      await setCache(CACHE_KEYS.IMAGES, images);
      await setCache(CACHE_KEYS.LAST_UPDATED, timestamp);
      
      // 同时更新内存缓存
      memoryCache.images = images;
      memoryCache.lastUpdated = timestamp;
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('更新缓存中的图片失败:', error);
    
    // Redis 操作失败，尝试更新内存缓存
    const imageIndex = memoryCache.images.findIndex(img => img.id === imageId);
    
    if (imageIndex !== -1) {
      memoryCache.images[imageIndex] = {
        ...memoryCache.images[imageIndex],
        ...updateData
      };
      
      memoryCache.lastUpdated = new Date().toISOString();
      return true;
    }
    
    return false;
  }
};

/**
 * 清空缓存
 */
export const clearCache = async () => {
  try {
    // 清空 Redis 缓存
    await setCache(CACHE_KEYS.IMAGES, []);
    await setCache(CACHE_KEYS.LAST_UPDATED, new Date().toISOString());
    await setCache(CACHE_KEYS.IS_INITIALIZED, false);
    
    // 同时清空内存缓存
    memoryCache.images = [];
    memoryCache.lastUpdated = new Date().toISOString();
    memoryCache.isInitialized = false;
    
    console.log('Redis 缓存已清空');
  } catch (error) {
    console.error('清空 Redis 缓存失败:', error);
    
    // Redis 操作失败，仅清空内存缓存
    memoryCache.images = [];
    memoryCache.lastUpdated = new Date().toISOString();
    memoryCache.isInitialized = false;
  }
};

/**
 * 同步缓存与 IndexedDB 和云存储
 * @param {Array} localImages - 本地图片数组
 * @param {Array} cloudImages - 云存储图片数组
 */
export const syncCache = async (localImages, cloudImages) => {
  try {
    // 首先确保输入参数是有效的
    const validLocalImages = Array.isArray(localImages) ? localImages : [];
    const validCloudImages = Array.isArray(cloudImages) ? cloudImages : [];
    
    console.log(`合并图片: 本地 ${validLocalImages.length} 张, 云存储 ${validCloudImages.length} 张`);
    
    // 合并本地和云存储图片，去除重复项
    const mergedImages = mergeAndDeduplicateImages(validLocalImages, validCloudImages);
    
    // 更新 Redis 缓存
    const timestamp = new Date().toISOString();
    await setCache(CACHE_KEYS.IMAGES, mergedImages);
    await setCache(CACHE_KEYS.LAST_UPDATED, timestamp);
    await setCache(CACHE_KEYS.IS_INITIALIZED, true);
    
    // 同时更新内存缓存
    memoryCache.images = mergedImages;
    memoryCache.lastUpdated = timestamp;
    memoryCache.isInitialized = true;
    
    console.log(`合并后共有 ${mergedImages.length} 张图片`);
    console.log(`Redis 缓存已同步，共 ${mergedImages.length} 张图片`);
  } catch (error) {
    console.error('同步 Redis 缓存时出错:', error);
    
    // Redis 操作失败，尝试更新内存缓存
    try {
      const validLocalImages = Array.isArray(localImages) ? localImages : [];
      const validCloudImages = Array.isArray(cloudImages) ? cloudImages : [];
      
      // 合并本地和云存储图片，去除重复项
      const mergedImages = mergeAndDeduplicateImages(validLocalImages, validCloudImages);
      
      // 更新内存缓存
      memoryCache.images = mergedImages;
      memoryCache.lastUpdated = new Date().toISOString();
      memoryCache.isInitialized = true;
      
      console.log(`合并后共有 ${mergedImages.length} 张图片（仅内存缓存）`);
    } catch (mergeError) {
      console.error('合并图片时出错:', mergeError);
      // 确保缓存始终处于有效状态
      memoryCache.images = memoryCache.images || [];
      memoryCache.lastUpdated = memoryCache.lastUpdated || new Date().toISOString();
      memoryCache.isInitialized = true;
    }
  }
};

/**
 * 合并本地和云存储图片，去除重复项
 * 优先保留本地图片，如果本地没有才显示云存储图片
 * @param {Array} localImages - 本地图片数组
 * @param {Array} cloudImages - 云存储图片数组（已格式化）
 * @returns {Array} 合并后的图片数组
 */
const mergeAndDeduplicateImages = (localImages, cloudImages) => {
  try {
    // 首先确保输入参数是数组
    const localImagesArray = Array.isArray(localImages) ? localImages : [];
    const cloudImagesArray = Array.isArray(cloudImages) ? cloudImages : [];
    
    console.log(`合并图片: 本地 ${localImagesArray.length} 张, 云存储 ${cloudImagesArray.length} 张`);
    
    // 创建一个集合来跟踪已处理的云存储文件名
    const processedCloudFileNames = new Set();
    // 创建一个集合来跟踪已处理的本地图片文件名
    const processedLocalFileNames = new Set();
    const result = [];
    
    // 首先添加所有本地图片
    for (const localImage of localImagesArray) {
      if (!localImage) continue;
      
      // 记录本地图片文件名
      if (localImage.fileName) {
        processedLocalFileNames.add(localImage.fileName);
      }
      
      // 如果本地图片有云存储信息，记录云存储文件名
      if (localImage.cloudFileName) {
        processedCloudFileNames.add(localImage.cloudFileName);
      }
      
      result.push(localImage);
    }
    
    // 然后添加不在本地的云存储图片
    for (const cloudImage of cloudImagesArray) {
      if (!cloudImage) continue;
      
      // 获取云存储图片的文件名/ID
      const cloudKey = cloudImage.id || cloudImage.cloudFileName || cloudImage.fileName;
      
      // 如果这个云存储文件还没有处理过，则添加这张云存储图片
      if (cloudKey && 
          !processedCloudFileNames.has(cloudKey) && 
          !processedLocalFileNames.has(cloudKey)) {
        
        // 已经格式化的云存储图片直接添加
        result.push(cloudImage);
        processedCloudFileNames.add(cloudKey);
      }
    }
    
    // 按创建时间排序，最新的在前
    const sortedResult = result.sort((a, b) => {
      try {
        return new Date(b.createdAt) - new Date(a.createdAt);
      } catch (e) {
        return 0; // 如果排序出错，保持原来的顺序
      }
    });
    
    console.log(`合并后共有 ${sortedResult.length} 张图片`);
    return sortedResult;
  } catch (error) {
    console.error('合并图片时出错:', error);
    return []; // 出错时返回空数组
  }
};
