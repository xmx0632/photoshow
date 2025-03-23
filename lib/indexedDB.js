/**
 * IndexedDB 工具类
 * 用于管理本地图片存储，支持自动清理过期图片
 */

// 数据库配置
const DB_NAME = 'photoShowDB';
const DB_VERSION = 1;
const IMAGES_STORE = 'generatedImages';
const MAX_STORAGE_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * 检查是否在浏览器环境
 * @returns {boolean} 是否在浏览器环境
 */
const isBrowser = () => {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
};

/**
 * 初始化数据库
 * @returns {Promise<IDBDatabase>} 数据库实例
 */
export const initDB = () => {
  return new Promise((resolve, reject) => {
    // 检查是否在服务端环境
    if (!isBrowser()) {
      reject(new Error('IndexedDB 只能在浏览器环境中使用，当前在服务端环境'));
      return;
    }

    // 检查浏览器支持
    if (!window.indexedDB) {
      reject(new Error('您的浏览器不支持 IndexedDB，无法使用本地存储功能'));
      return;
    }

    // 打开数据库
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    // 数据库升级事件
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // 创建图片存储对象
      if (!db.objectStoreNames.contains(IMAGES_STORE)) {
        const store = db.createObjectStore(IMAGES_STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    // 成功事件
    request.onsuccess = (event) => {
      const db = event.target.result;
      resolve(db);
    };

    // 错误事件
    request.onerror = (event) => {
      reject(new Error(`数据库错误: ${event.target.error}`));
    };
  });
};

/**
 * 保存图片到 IndexedDB
 * @param {Object} imageData 图片数据对象
 * @returns {Promise<string>} 图片ID
 */
export const saveImage = async (imageData) => {
  try {
    // 检查是否在服务端环境
    if (!isBrowser()) {
      console.warn('IndexedDB 只能在浏览器环境中使用，当前在服务端环境');
      return imageData.id; // 在服务端环境下直接返回 ID
    }

    const db = await initDB();
    
    // 检查存储空间并清理旧数据
    await checkAndCleanStorage();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([IMAGES_STORE], 'readwrite');
      const store = transaction.objectStore(IMAGES_STORE);
      
      // 添加图片数据
      const request = store.add(imageData);
      
      request.onsuccess = () => {
        resolve(imageData.id);
      };
      
      request.onerror = (event) => {
        reject(new Error(`保存图片失败: ${event.target.error}`));
      };
      
      // 完成事务
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('保存图片到 IndexedDB 失败:', error);
    // 即使出错也返回 ID，避免影响其他功能
    return imageData?.id || null;
  }
};

/**
 * 获取所有保存的图片
 * @returns {Promise<Array>} 图片数组
 */
export const getAllImages = async () => {
  try {
    // 检查是否在服务端环境
    if (!isBrowser()) {
      console.warn('IndexedDB 只能在浏览器环境中使用，当前在服务端环境');
      return []; // 在服务端环境下返回空数组
    }

    const db = await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([IMAGES_STORE], 'readonly');
      const store = transaction.objectStore(IMAGES_STORE);
      const index = store.index('createdAt');
      
      // 获取所有图片，按创建时间倒序排列
      const request = index.openCursor(null, 'prev');
      const images = [];
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          images.push(cursor.value);
          cursor.continue();
        } else {
          resolve(images);
        }
      };
      
      request.onerror = (event) => {
        reject(new Error(`获取图片失败: ${event.target.error}`));
      };
      
      // 完成事务
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('从 IndexedDB 获取图片失败:', error);
    return [];
  }
};

/**
 * 删除图片
 * @param {string} id 图片ID
 * @returns {Promise<boolean>} 是否删除成功
 */
export const deleteImage = async (id) => {
  try {
    // 检查是否在服务端环境
    if (!isBrowser()) {
      console.warn('IndexedDB 只能在浏览器环境中使用，当前在服务端环境');
      return true; // 在服务端环境下返回成功
    }
    
    const db = await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([IMAGES_STORE], 'readwrite');
      const store = transaction.objectStore(IMAGES_STORE);
      
      // 删除图片
      const request = store.delete(id);
      
      request.onsuccess = () => {
        resolve(true);
      };
      
      request.onerror = (event) => {
        reject(new Error(`删除图片失败: ${event.target.error}`));
      };
      
      // 完成事务
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('从 IndexedDB 删除图片失败:', error);
    return true; // 即使出错也返回成功，避免影响其他功能
  }
};

/**
 * 计算图片数据大小（字节）
 * @param {Object} imageData 图片数据对象
 * @returns {number} 数据大小（字节）
 */
const calculateImageSize = (imageData) => {
  // 计算 JSON 字符串大小
  const jsonString = JSON.stringify(imageData);
  
  // 计算 Base64 图片数据大小
  let imageSize = 0;
  if (imageData.imageUrl) {
    // 移除 Base64 前缀
    const base64Data = imageData.imageUrl.split(',')[1] || imageData.imageUrl;
    // Base64 编码后的数据比原始数据大约大 1/3
    imageSize = Math.ceil((base64Data.length * 3) / 4);
  }
  
  return jsonString.length + imageSize;
};

/**
 * 获取当前存储使用情况
 * @returns {Promise<Object>} 存储使用情况
 */
export const getStorageUsage = async () => {
  try {
    // 检查是否在服务端环境
    if (!isBrowser()) {
      console.warn('IndexedDB 只能在浏览器环境中使用，当前在服务端环境');
      return {
        count: 0,
        totalSize: 0,
        totalSizeMB: 0,
        isExceedingLimit: false,
      };
    }

    const images = await getAllImages();
    
    // 计算总存储大小
    let totalSize = 0;
    for (const image of images) {
      totalSize += calculateImageSize(image);
    }
    
    return {
      count: images.length,
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      isExceedingLimit: totalSize > MAX_STORAGE_SIZE,
    };
  } catch (error) {
    console.error('获取存储使用情况失败:', error);
    return {
      count: 0,
      totalSize: 0,
      totalSizeMB: 0,
      isExceedingLimit: false,
    };
  }
};

/**
 * 检查存储空间并清理旧数据
 * @returns {Promise<boolean>} 是否执行了清理
 */
export const checkAndCleanStorage = async () => {
  try {
    // 检查是否在服务端环境
    if (!isBrowser()) {
      console.warn('IndexedDB 只能在浏览器环境中使用，当前在服务端环境');
      return false; // 在服务端环境下不执行清理
    }

    const usage = await getStorageUsage();
    
    // 如果存储空间超出限制，清理旧数据
    if (usage.isExceedingLimit) {
      const images = await getAllImages();
      
      // 按创建时间排序（最旧的在前）
      images.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      
      // 计算需要删除的图片数量
      let currentSize = usage.totalSize;
      let deletedCount = 0;
      
      // 删除旧图片直到存储空间低于限制的 80%
      for (const image of images) {
        if (currentSize <= MAX_STORAGE_SIZE * 0.8) {
          break;
        }
        
        const imageSize = calculateImageSize(image);
        await deleteImage(image.id);
        
        currentSize -= imageSize;
        deletedCount++;
      }
      
      console.log(`已自动清理 ${deletedCount} 张旧图片，释放空间至 ${(currentSize / (1024 * 1024)).toFixed(2)} MB`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('检查存储空间失败:', error);
    return false;
  }
};

/**
 * 从 localStorage 迁移数据到 IndexedDB
 * @returns {Promise<number>} 迁移的图片数量
 */
export const migrateFromLocalStorage = async () => {
  try {
    // 检查是否有 localStorage 数据
    const savedImagesJson = localStorage.getItem('generatedImages') || localStorage.getItem('savedImages');
    if (!savedImagesJson) {
      return 0;
    }
    
    // 解析数据
    const savedImages = JSON.parse(savedImagesJson);
    if (!Array.isArray(savedImages) || savedImages.length === 0) {
      return 0;
    }
    
    // 迁移数据
    let migratedCount = 0;
    for (const image of savedImages) {
      await saveImage(image);
      migratedCount++;
    }
    
    // 清理 localStorage
    localStorage.removeItem('generatedImages');
    localStorage.removeItem('savedImages');
    
    console.log(`已从 localStorage 迁移 ${migratedCount} 张图片到 IndexedDB`);
    return migratedCount;
  } catch (error) {
    console.error('从 localStorage 迁移数据失败:', error);
    return 0;
  }
};

/**
 * 根据提示词查找最新的图片
 * @param {string} prompt 图片提示词
 * @returns {Promise<Object|null>} 图片数据或 null
 */
export const findImageByPrompt = async (prompt) => {
  try {
    const db = await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([IMAGES_STORE], 'readonly');
      const store = transaction.objectStore(IMAGES_STORE);
      const index = store.index('createdAt');
      
      // 获取所有图片，按创建时间倒序排列
      const request = index.openCursor(null, 'prev');
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          // 检查提示词是否匹配
          if (cursor.value.prompt === prompt) {
            resolve(cursor.value);
            return;
          }
          cursor.continue();
        } else {
          // 没有找到匹配的图片
          resolve(null);
        }
      };
      
      request.onerror = (event) => {
        reject(new Error(`查找图片失败: ${event.target.error}`));
      };
      
      // 完成事务
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('从 IndexedDB 查找图片失败:', error);
    return null;
  }
};

/**
 * 更新图片的云存储信息
 * @param {string} imageId 图片ID
 * @param {Object} cloudInfo 云存储信息
 * @returns {Promise<boolean>} 是否更新成功
 */
export const updateImageCloudInfo = async (imageId, cloudInfo) => {
  try {
    const db = await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([IMAGES_STORE], 'readwrite');
      const store = transaction.objectStore(IMAGES_STORE);
      
      // 直接使用图片ID获取图片
      const getRequest = store.get(imageId);
      
      getRequest.onsuccess = (event) => {
        const image = event.target.result;
        if (!image) {
          console.warn(`图片 ${imageId} 不存在`);
          resolve(false);
          return;
        }
        
        // 更新云存储信息
        image.cloudFileName = cloudInfo.cloudFileName;
        image.cloudUrl = cloudInfo.cloudUrl;
        image.uploadedAt = cloudInfo.uploadedAt;
        
        // 保存更新后的图片
        const updateRequest = store.put(image);
        
        updateRequest.onsuccess = () => {
          console.log(`成功更新图片 ${imageId} 的云存储信息`);
          resolve(true);
        };
        
        updateRequest.onerror = (event) => {
          reject(new Error(`更新图片失败: ${event.target.error}`));
        };
      };
      
      getRequest.onerror = (event) => {
        reject(new Error(`获取图片失败: ${event.target.error}`));
      };
      
      // 完成事务
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('更新图片云存储信息失败:', error);
    return false;
  }
};
