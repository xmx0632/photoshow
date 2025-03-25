import { 
  initCache, 
  getCachedImages, 
  isCacheInitialized,
  syncCache,
  getLastUpdated,
  getCurrentCacheType
} from '../../../lib/cacheManager';
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
 * 检查缓存是否过期
 * @returns {Promise<boolean>} 是否过期
 */
async function isCacheExpired() {
  const lastUpdated = await getLastUpdated();
  if (!lastUpdated) return true;
  
  // 缓存超过5分钟则认为过期
  const fiveMinutes = 5 * 60 * 1000;
  const lastUpdatedTime = typeof lastUpdated === 'string' 
    ? new Date(lastUpdated).getTime() 
    : lastUpdated.getTime();
    
  return (Date.now() - lastUpdatedTime) > fiveMinutes;
}

/**
 * 处理获取缓存图片的请求
 */
async function handleGetCachedImages(req, res) {
  // 添加缓存控制头，客户端缓存30秒
  res.setHeader('Cache-Control', 'public, max-age=30');
  
  // 如果缓存未初始化或者已过期，则同步缓存
  const isInitialized = await isCacheInitialized();
  const isExpired = await isCacheExpired();
  
  if (!isInitialized || isExpired) {
    try {
      console.log('缓存需要更新，正在同步...');
      await syncCacheData();
    } catch (error) {
      console.error('同步缓存失败:', error);
      // 即使同步失败，也尝试返回当前缓存中的图片
    }
  }

  // 返回缓存的图片
  const cachedImages = await getCachedImages();
  const imagesArray = Array.isArray(cachedImages) ? cachedImages : [];
  console.log(`返回缓存中的 ${imagesArray.length} 张图片`);
  
  return res.status(200).json({ 
    success: true, 
    images: imagesArray,
    count: imagesArray.length,
    cacheType: getCurrentCacheType()
  });
}

/**
 * 处理同步缓存的请求
 */
async function handleSyncCache(req, res) {
  try {
    console.log('收到缓存同步请求，正在同步...');
    await syncCacheData();
    const cachedImages = await getCachedImages();
    const imagesArray = Array.isArray(cachedImages) ? cachedImages : [];
    
    console.log(`缓存同步完成，当前缓存中有 ${imagesArray.length} 张图片`);
    
    // 添加缓存控制头
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(200).json({ 
      success: true, 
      message: '缓存同步成功',
      count: imagesArray.length,
      cacheType: getCurrentCacheType()
    });
  } catch (error) {
    console.error('同步缓存失败:', error);
    return res.status(500).json({ error: '同步缓存失败', details: error.message });
  }
}

// 添加同步锁，防止重复调用
syncCacheData
let isSyncing = false;

/**
 * 同步缓存数据
 * 仅从云存储获取图片，并更新缓存
 * 注意：IndexedDB 只能在浏览器中使用，不能在服务端使用
 */
async function syncCacheData() {
  // 如果已经在同步中，则等待完成
  if (isSyncing) {
    console.log('缓存同步已在进行中，跳过此次请求');
    return true;
  }
  
  isSyncing = true;
  
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
    await syncCache(localImages, formattedCloudImages);
    
    return true;
  } catch (error) {
    console.error('同步缓存数据失败:', error);
    throw error;
  } finally {
    // 无论成功失败，都释放同步锁
    isSyncing = false;
  }
}
