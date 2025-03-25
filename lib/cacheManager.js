/**
 * 缓存管理器
 * 提供统一的缓存接口，可以根据配置切换不同的缓存实现（文件系统或 Redis）
 */

// 导入不同的缓存实现
import * as fileCache from './cacheService';
import * as redisCache from './redisCacheService';

// 缓存类型枚举
export const CACHE_TYPES = {
  FILE: 'file',
  REDIS: 'redis'
};

// 默认缓存类型
let currentCacheType = CACHE_TYPES.FILE;

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
 * @returns {Promise<Array>|Array} 图片数组
 */
export const getCachedImages = async () => {
  const cache = getCurrentCache();
  if (currentCacheType === CACHE_TYPES.REDIS) {
    return await cache.getCachedImages();
  } else {
    return cache.getCachedImages();
  }
};

/**
 * 检查缓存是否已初始化
 * @returns {Promise<boolean>|boolean} 是否已初始化
 */
export const isCacheInitialized = async () => {
  const cache = getCurrentCache();
  if (currentCacheType === CACHE_TYPES.REDIS) {
    return await cache.isCacheInitialized();
  } else {
    return cache.isCacheInitialized();
  }
};

/**
 * 获取缓存最后更新时间
 * @returns {Promise<string>|Date} 最后更新时间
 */
export const getLastUpdated = async () => {
  const cache = getCurrentCache();
  if (currentCacheType === CACHE_TYPES.REDIS) {
    return await cache.getLastUpdated();
  } else {
    return cache.getLastUpdated();
  }
};

/**
 * 添加图片到缓存
 * @param {Object} image - 图片对象
 * @returns {Promise<void>|void}
 */
export const addImageToCache = async (image) => {
  const cache = getCurrentCache();
  if (currentCacheType === CACHE_TYPES.REDIS) {
    await cache.addImageToCache(image);
  } else {
    cache.addImageToCache(image);
  }
};

/**
 * 从缓存中移除图片
 * @param {string} imageId - 图片 ID
 * @returns {Promise<boolean>|boolean} 是否成功移除
 */
export const removeImageFromCache = async (imageId) => {
  const cache = getCurrentCache();
  if (currentCacheType === CACHE_TYPES.REDIS) {
    return await cache.removeImageFromCache(imageId);
  } else {
    return cache.removeImageFromCache(imageId);
  }
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
