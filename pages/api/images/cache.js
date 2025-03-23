import { 
  initCache, 
  getCachedImages, 
  isCacheInitialized,
  syncCache
} from '../../../lib/cacheService';
import { listImages } from '../../../lib/cloudflare';

/**
 * 图片缓存API
 * 用于获取、同步和管理图片缓存
 */
export default async function handler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        // 获取缓存的图片列表
        await handleGetCachedImages(req, res);
        break;
      case 'POST':
        // 同步缓存
        await handleSyncCache(req, res);
        break;
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ error: `不支持的方法: ${method}` });
    }
  } catch (error) {
    console.error('缓存API错误:', error);
    res.status(500).json({ error: '服务器内部错误', details: error.message });
  }
}

/**
 * 处理获取缓存图片的请求
 */
async function handleGetCachedImages(req, res) {
  // 如果缓存未初始化，则先同步缓存
  if (!isCacheInitialized()) {
    try {
      console.log('缓存未初始化，正在同步缓存...');
      await syncCacheData();
    } catch (error) {
      console.error('同步缓存失败:', error);
      // 即使同步失败，也尝试返回当前缓存中的图片
    }
  }

  // 返回缓存的图片
  const cachedImages = getCachedImages();
  console.log(`返回缓存中的 ${cachedImages.length} 张图片`);
  return res.status(200).json({ 
    success: true, 
    images: cachedImages,
    count: cachedImages.length
  });
}

/**
 * 处理同步缓存的请求
 */
async function handleSyncCache(req, res) {
  try {
    console.log('收到缓存同步请求，正在同步...');
    await syncCacheData();
    const cachedImages = getCachedImages();
    
    console.log(`缓存同步完成，当前缓存中有 ${cachedImages.length} 张图片`);
    return res.status(200).json({ 
      success: true, 
      message: '缓存同步成功',
      count: cachedImages.length
    });
  } catch (error) {
    console.error('同步缓存失败:', error);
    return res.status(500).json({ error: '同步缓存失败', details: error.message });
  }
}

/**
 * 同步缓存数据
 * 仅从云存储获取图片，并更新缓存
 * 注意：IndexedDB 只能在浏览器中使用，不能在服务端使用
 */
async function syncCacheData() {
  try {
    // 在服务端不能使用 IndexedDB，所以只从云存储获取图片
    let localImages = [];
    
    // 获取云存储图片
    let cloudImages = [];
    try {
      // listImages 现在直接返回图片数组，而不是包含 images 属性的对象
      cloudImages = await listImages();
      console.log(`从云存储获取到 ${cloudImages.length} 张图片，准备格式化并加入缓存`);
    } catch (error) {
      console.warn('获取云存储图片失败:', error);
      cloudImages = [];
    }

    // 确保 cloudImages 是数组
    if (!Array.isArray(cloudImages)) {
      console.warn('云存储返回的不是数组，将使用空数组');
      cloudImages = [];
    }

    // 将云存储图片转换为与本地图片相同的格式
    const formattedCloudImages = cloudImages.map(img => {
      if (!img || !img.key) {
        console.warn('存在无效的云存储图片数据:', img);
        return null;
      }
      return {
        id: img.key,
        prompt: img.metadata?.prompt || '无提示词',
        imageUrl: img.url,
        createdAt: img.lastModified || new Date().toISOString(),
        isCloudImage: true,
        cloudFileName: img.key,
        fileName: img.key
      };
    }).filter(img => img !== null); // 过滤掉无效数据

    console.log(`格式化后有 ${formattedCloudImages.length} 张有效图片准备同步到缓存`);

    // 同步缓存
    syncCache(localImages, formattedCloudImages);
    
    return true;
  } catch (error) {
    console.error('同步缓存数据失败:', error);
    throw error;
  }
}
