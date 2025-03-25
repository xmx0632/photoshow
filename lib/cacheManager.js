/**
 * 缓存管理器
 * 提供统一的缓存接口，可以根据配置切换不同的缓存实现（文件系统或 Redis）
 * 增加了内存级缓存和合并查询功能，提高缓存访问性能
 */

// 导入不同的缓存实现
import * as fileCache from './cacheService';
import * as redisCache from './redisCacheService';
import { getCacheType } from './config';

// 缓存类型枚举
export const CACHE_TYPES = {
  FILE: 'file',
  REDIS: 'redis'
};

// 从配置中获取缓存类型
let currentCacheType = getCacheType();

// 输出当前使用的缓存类型
console.log(`缓存管理器初始化，使用缓存类型: ${currentCacheType}`);


// 内存级缓存，减少对存储层的访问
let memoryLevelCache = {
  images: null,
  lastFetch: 0,
  ttl: 10000, // 10秒内不重复获取
  isInitialized: null,
  lastInitializedCheck: 0,
  lastUpdated: null,
  lastUpdatedCheck: 0
};

/**
 * 设置当前使用的缓存类型
 * @param {string} cacheType - 缓存类型，可以是 'file' 或 'redis'
 */
export const setCacheType = (cacheType) => {
  if (cacheType === CACHE_TYPES.FILE || cacheType === CACHE_TYPES.REDIS) {
    currentCacheType = cacheType;
    console.log(`缓存类型已设置为: ${cacheType}`);
  } else {
    console.error(`无效的缓存类型: ${cacheType}，使用默认类型: ${currentCacheType}`);
  }
};

/**
 * 获取当前使用的缓存类型
 * @returns {string} 当前缓存类型
 */
export const getCurrentCacheType = () => {
  return currentCacheType;
};

/**
 * 获取当前缓存实现
 * @returns {Object} 当前缓存实现对象
 */
const getCurrentCache = () => {
  return currentCacheType === CACHE_TYPES.REDIS ? redisCache : fileCache;
};

/**
 * 初始化缓存
 * @param {Array} images - 图片数组
 */
export const initCache = async (images) => {
  const cache = getCurrentCache();
  if (currentCacheType === CACHE_TYPES.REDIS) {
    await cache.initCache(images);
  } else {
    cache.initCache(images);
  }
};

/**
 * 获取缓存中的所有图片
 * 增加了内存级缓存，减少对存储层的访问
 * @returns {Promise<Array>|Array} 图片数组
 */
export const getCachedImages = async () => {
  // 检查内存缓存是否有效
  if (memoryLevelCache.images && (Date.now() - memoryLevelCache.lastFetch < memoryLevelCache.ttl)) {
    return memoryLevelCache.images;
  }
  
  const cache = getCurrentCache();
  let result;
  if (currentCacheType === CACHE_TYPES.REDIS) {
    result = await cache.getCachedImages();
  } else {
    result = cache.getCachedImages();
  }
  
  // 更新内存缓存
  memoryLevelCache.images = result;
  memoryLevelCache.lastFetch = Date.now();
  
  return result;
};

/**
 * 检查缓存是否已初始化
 * 增加了内存级缓存，减少对存储层的访问
 * @returns {Promise<boolean>|boolean} 是否已初始化
 */
export const isCacheInitialized = async () => {
  // 检查内存缓存是否有效
  if (memoryLevelCache.isInitialized !== null && 
      (Date.now() - memoryLevelCache.lastInitializedCheck < memoryLevelCache.ttl)) {
    return memoryLevelCache.isInitialized;
  }
  
  const cache = getCurrentCache();
  let result;
  if (currentCacheType === CACHE_TYPES.REDIS) {
    result = await cache.isCacheInitialized();
  } else {
    result = cache.isCacheInitialized();
  }
  
  // 更新内存缓存
  memoryLevelCache.isInitialized = result;
  memoryLevelCache.lastInitializedCheck = Date.now();
  
  return result;
};

/**
 * 获取缓存最后更新时间
 * 增加了内存级缓存，减少对存储层的访问
 * @returns {Promise<string>|Date} 最后更新时间
 */
export const getLastUpdated = async () => {
  // 检查内存缓存是否有效
  if (memoryLevelCache.lastUpdated !== null && 
      (Date.now() - memoryLevelCache.lastUpdatedCheck < memoryLevelCache.ttl)) {
    return memoryLevelCache.lastUpdated;
  }
  
  const cache = getCurrentCache();
  let result;
  if (currentCacheType === CACHE_TYPES.REDIS) {
    result = await cache.getLastUpdated();
  } else {
    result = cache.getLastUpdated();
  }
  
  // 更新内存缓存
  memoryLevelCache.lastUpdated = result;
  memoryLevelCache.lastUpdatedCheck = Date.now();
  
  return result;
};

/**
 * 获取缓存状态，合并多个缓存查询为一次调用
 * 这个函数将获取图片、初始化状态和最后更新时间合并为一次查询
 * @param {number} cacheExpireMinutes - 缓存过期时间（分钟），默认 30 分钟
 * @returns {Promise<Object>} 缓存状态对象
 */
export const getCacheStatus = async (cacheExpireMinutes = 30) => {
  // 如果内存缓存中已有完整数据且未过期，直接返回
  const now = Date.now();
  const allCached = memoryLevelCache.images !== null && 
                  memoryLevelCache.isInitialized !== null && 
                  memoryLevelCache.lastUpdated !== null;
  const allFresh = (now - memoryLevelCache.lastFetch < memoryLevelCache.ttl) && 
                 (now - memoryLevelCache.lastInitializedCheck < memoryLevelCache.ttl) && 
                 (now - memoryLevelCache.lastUpdatedCheck < memoryLevelCache.ttl);
                 
  if (allCached && allFresh) {
    // 计算是否过期
    const expireMs = cacheExpireMinutes * 60 * 1000;
    const lastUpdatedTime = typeof memoryLevelCache.lastUpdated === 'string' 
      ? new Date(memoryLevelCache.lastUpdated).getTime() 
      : (memoryLevelCache.lastUpdated ? memoryLevelCache.lastUpdated.getTime() : 0);
    const isExpired = !lastUpdatedTime || (now - lastUpdatedTime) > expireMs;
    
    return { 
      images: Array.isArray(memoryLevelCache.images) ? memoryLevelCache.images : [], 
      isInitialized: memoryLevelCache.isInitialized, 
      isExpired,
      lastUpdated: memoryLevelCache.lastUpdated 
    };
  }
  
  // 否则从存储层获取数据
  const cache = getCurrentCache();
  let images, isInitialized, lastUpdated;
  
  if (currentCacheType === CACHE_TYPES.REDIS) {
    // 并行获取所有缓存数据，减少等待时间
    [images, isInitialized, lastUpdated] = await Promise.all([
      cache.getCachedImages(),
      cache.isCacheInitialized(),
      cache.getLastUpdated()
    ]);
  } else {
    images = cache.getCachedImages();
    isInitialized = cache.isCacheInitialized();
    lastUpdated = cache.getLastUpdated();
  }
  
  // 更新内存缓存
  memoryLevelCache.images = images;
  memoryLevelCache.lastFetch = now;
  memoryLevelCache.isInitialized = isInitialized;
  memoryLevelCache.lastInitializedCheck = now;
  memoryLevelCache.lastUpdated = lastUpdated;
  memoryLevelCache.lastUpdatedCheck = now;
  
  // 计算是否过期
  const expireMs = cacheExpireMinutes * 60 * 1000;
  const lastUpdatedTime = typeof lastUpdated === 'string' 
    ? new Date(lastUpdated).getTime() 
    : (lastUpdated ? lastUpdated.getTime() : 0);
  const isExpired = !lastUpdatedTime || (now - lastUpdatedTime) > expireMs;
  
  return { 
    images: Array.isArray(images) ? images : [], 
    isInitialized, 
    isExpired,
    lastUpdated 
  };
};

/**
 * 添加图片到缓存
 * @param {Object} image - 图片对象
 * @returns {Promise<void>|void}
 */
export const addImageToCache = async (image) => {
  // 首先更新底层缓存
  const cache = getCurrentCache();
  if (currentCacheType === CACHE_TYPES.REDIS) {
    await cache.addImageToCache(image);
  } else {
    cache.addImageToCache(image);
  }
  
  // 然后更新内存缓存（如果存在）
  if (memoryLevelCache.images) {
    // 检查图片是否已存在
    const existingIndex = memoryLevelCache.images.findIndex(img => img.id === image.id);
    if (existingIndex >= 0) {
      // 如果已存在，则替换
      memoryLevelCache.images[existingIndex] = image;
    } else {
      // 如果不存在，则添加
      memoryLevelCache.images.push(image);
    }
    console.log(`内存缓存已更新，添加图片: ${image.id}`);
  }
};

/**
 * 从缓存中移除图片
 * @param {string} imageId - 图片 ID
 * @returns {Promise<boolean>|boolean} 是否成功移除
 */
export const removeImageFromCache = async (imageId) => {
  // 首先更新底层缓存
  const cache = getCurrentCache();
  let result;
  if (currentCacheType === CACHE_TYPES.REDIS) {
    result = await cache.removeImageFromCache(imageId);
  } else {
    result = cache.removeImageFromCache(imageId);
  }
  
  // 然后更新内存缓存（如果存在）
  if (memoryLevelCache.images) {
    const originalLength = memoryLevelCache.images.length;
    memoryLevelCache.images = memoryLevelCache.images.filter(img => img.id !== imageId);
    
    if (memoryLevelCache.images.length < originalLength) {
      console.log(`内存缓存已更新，移除图片: ${imageId}`);
    }
  }
  
  return result;
};

/**
 * 更新缓存中的图片
 * @param {string} imageId - 图片 ID
 * @param {Object} updateData - 更新数据
 * @returns {Promise<boolean>|boolean} 是否成功更新
 */
export const updateImageInCache = async (imageId, updateData) => {
  const cache = getCurrentCache();
  if (currentCacheType === CACHE_TYPES.REDIS) {
    return await cache.updateImageInCache(imageId, updateData);
  } else {
    return cache.updateImageInCache(imageId, updateData);
  }
};

/**
 * 清空缓存
 * @returns {Promise<void>|void}
 */
export const clearCache = async () => {
  const cache = getCurrentCache();
  if (currentCacheType === CACHE_TYPES.REDIS) {
    await cache.clearCache();
  } else {
    cache.clearCache();
  }
};

/**
 * 同步缓存与 IndexedDB 和云存储
 * @param {Array} localImages - 本地图片数组
 * @param {Array} cloudImages - 云存储图片数组
 * @returns {Promise<void>|void}
 */
export const syncCache = async (localImages, cloudImages) => {
  const cache = getCurrentCache();
  if (currentCacheType === CACHE_TYPES.REDIS) {
    await cache.syncCache(localImages, cloudImages);
  } else {
    cache.syncCache(localImages, cloudImages);
  }
};
