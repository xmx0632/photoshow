/**
 * 图片缓存服务
 * 用于在服务端维护图片列表的内存缓存，提高页面响应速度
 * 并确保 IndexedDB 和云存储上图片数据的一致性
 */

// 缓存对象
let imageCache = {
  images: [],
  lastUpdated: null,
  isInitialized: false
};

/**
 * 初始化缓存
 * @param {Array} images - 图片数组
 */
export const initCache = (images) => {
  imageCache.images = images;
  imageCache.lastUpdated = new Date();
  imageCache.isInitialized = true;
  console.log(`缓存已初始化，共 ${images.length} 张图片`);
};

/**
 * 获取缓存中的所有图片
 * @returns {Array} 图片数组
 */
export const getCachedImages = () => {
  return imageCache.images;
};

/**
 * 检查缓存是否已初始化
 * @returns {boolean} 是否已初始化
 */
export const isCacheInitialized = () => {
  return imageCache.isInitialized;
};

/**
 * 获取缓存最后更新时间
 * @returns {Date} 最后更新时间
 */
export const getLastUpdated = () => {
  return imageCache.lastUpdated;
};

/**
 * 添加图片到缓存
 * @param {Object} image - 图片对象
 */
export const addImageToCache = (image) => {
  // 检查是否已存在相同 ID 的图片
  const existingIndex = imageCache.images.findIndex(img => img.id === image.id);
  
  if (existingIndex !== -1) {
    // 如果存在，则更新
    imageCache.images[existingIndex] = image;
  } else {
    // 如果不存在，则添加
    imageCache.images.push(image);
  }
  
  imageCache.lastUpdated = new Date();
};

/**
 * 从缓存中移除图片
 * @param {string} imageId - 图片 ID
 * @returns {boolean} 是否成功移除
 */
export const removeImageFromCache = (imageId) => {
  const initialLength = imageCache.images.length;
  imageCache.images = imageCache.images.filter(img => img.id !== imageId);
  
  if (imageCache.images.length !== initialLength) {
    imageCache.lastUpdated = new Date();
    return true;
  }
  
  return false;
};

/**
 * 更新缓存中的图片
 * @param {string} imageId - 图片 ID
 * @param {Object} updateData - 更新数据
 * @returns {boolean} 是否成功更新
 */
export const updateImageInCache = (imageId, updateData) => {
  const imageIndex = imageCache.images.findIndex(img => img.id === imageId);
  
  if (imageIndex !== -1) {
    imageCache.images[imageIndex] = {
      ...imageCache.images[imageIndex],
      ...updateData
    };
    imageCache.lastUpdated = new Date();
    return true;
  }
  
  return false;
};

/**
 * 清空缓存
 */
export const clearCache = () => {
  imageCache.images = [];
  imageCache.lastUpdated = new Date();
  imageCache.isInitialized = false;
};

/**
 * 同步缓存与 IndexedDB 和云存储
 * @param {Array} localImages - 本地图片数组
 * @param {Array} cloudImages - 云存储图片数组
 */
export const syncCache = (localImages, cloudImages) => {
  try {
    // 首先确保输入参数是有效的
    const validLocalImages = Array.isArray(localImages) ? localImages : [];
    const validCloudImages = Array.isArray(cloudImages) ? cloudImages : [];
    
    console.log(`合并图片: 本地 ${validLocalImages.length} 张, 云存储 ${validCloudImages.length} 张`);
    
    // 合并本地和云存储图片，去除重复项
    const mergedImages = mergeAndDeduplicateImages(validLocalImages, validCloudImages);
    
    // 更新缓存
    imageCache.images = mergedImages;
    imageCache.lastUpdated = new Date();
    imageCache.isInitialized = true;
    
    console.log(`合并后共有 ${mergedImages.length} 张图片`);
    console.log(`缓存已同步，共 ${mergedImages.length} 张图片`);
    
    // 尝试将缓存数据保存到文件（仅在服务器端）
    if (typeof window === 'undefined') {
      try {
        // 动态导入 fs 和 path 模块，避免客户端报错
        const fs = require('fs');
        const path = require('path');
        
        // 创建缓存数据对象
        const cacheData = {
          images: mergedImages,
          lastUpdated: new Date().toISOString(),
          isInitialized: true
        };
        
        // 确保 data 目录存在
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        
        // 写入缓存文件
        const cachePath = path.join(dataDir, 'cache.json');
        fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2), 'utf8');
        console.log(`缓存数据已保存到文件: ${cachePath}`);
      } catch (fsError) {
        console.error('保存缓存数据到文件失败:', fsError);
        // 失败不影响内存缓存的使用
      }
    }
  } catch (error) {
    console.error('同步缓存时出错:', error);
    // 确保缓存始终处于有效状态
    imageCache.images = imageCache.images || [];
    imageCache.lastUpdated = imageCache.lastUpdated || new Date();
    imageCache.isInitialized = true;
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
