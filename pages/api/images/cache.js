import { 
  initCache, 
  getCachedImages, 
  isCacheInitialized,
  syncCache,
  getLastUpdated,
  getCurrentCacheType,
  getCacheStatus
} from '../../../lib/cacheManager';
import { listImages } from '../../../lib/cloudflare';
import { normalizeImageArray } from '../../../lib/imageDataModel';

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
  
  // 缓存超过30分钟则认为过期（原有5分钟）
  const thirtyMinutes = 30 * 60 * 1000;
  const lastUpdatedTime = typeof lastUpdated === 'string' 
    ? new Date(lastUpdated).getTime() 
    : lastUpdated.getTime();
    
  return (Date.now() - lastUpdatedTime) > thirtyMinutes;
}

/**
 * 处理获取缓存图片的请求
 * 优化策略：直接返回缓存数据，后台异步刷新缓存
 * 使用合并查询减少多次缓存访问
 */
async function handleGetCachedImages(req, res) {
  // 添加缓存控制头，客户端缓存30秒
  res.setHeader('Cache-Control', 'public, max-age=30');
  
  // 记录请求开始时间
  const requestStartTime = Date.now();
  
  // 使用合并查询获取缓存状态，减少多次缓存访问
  const cacheStatus = await getCacheStatus(30); // 30分钟过期时间
  const imagesArray = cacheStatus.images;
  
  // 如果缓存未初始化或已过期，在后台异步刷新缓存
  if (!cacheStatus.isInitialized || cacheStatus.isExpired) {
    console.log('缓存需要更新，在后台异步刷新...');
    // 使用 Promise 异步执行，不等待结果
    syncCacheData().catch(error => {
      console.error('后台异步刷新缓存失败:', error);
    });
  }

  // 立即返回当前缓存中的图片，不等待缓存刷新
  const requestTime = Date.now() - requestStartTime;
  console.log(`立即返回缓存中的 ${imagesArray.length} 张图片，请求耗时: ${requestTime}ms`);
  
  // 使用标准化的图片数据模型处理返回的图片数组
  const normalizedImages = normalizeImageArray(imagesArray);
  
  return res.status(200).json({ 
    success: true, 
    images: normalizedImages,
    count: normalizedImages.length,
    cacheType: getCurrentCacheType(),
    cacheStatus: {
      initialized: cacheStatus.isInitialized,
      expired: cacheStatus.isExpired,
      refreshing: !cacheStatus.isInitialized || cacheStatus.isExpired,
      requestTime: requestTime
    }
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
let isSyncing = false;

/**
 * 同步缓存数据
 * 仅从云存储获取图片，并更新缓存
 * 注意：IndexedDB 只能在浏览器中使用，不能在服务端使用
 * 增强了性能测量功能，记录每个步骤的执行时间
 */
async function syncCacheData() {
  // 如果已经在同步中，则等待完成
  if (isSyncing) {
    console.log('缓存同步已在进行中，跳过此次请求');
    return true;
  }
  
  isSyncing = true;
  
  // 性能测量开始
  const syncStartTime = Date.now();
  const perfMetrics = {
    fetchTime: 0,
    formatTime: 0,
    syncTime: 0,
    totalTime: 0
  };
  
  try {
    // 在服务端不能使用 IndexedDB，所以只从云存储获取图片
    let localImages = [];
    
    // 获取云存储图片
    const fetchStartTime = Date.now();
    let cloudImages = [];
    try {
      // listImages 现在直接返回图片数组，而不是包含 images 属性的对象
      cloudImages = await listImages();
      perfMetrics.fetchTime = Date.now() - fetchStartTime;
      console.log(`从云存储获取到 ${cloudImages.length} 张图片，耗时: ${perfMetrics.fetchTime}ms`);
    } catch (error) {
      perfMetrics.fetchTime = Date.now() - fetchStartTime;
      console.warn(`获取云存储图片失败, 耗时: ${perfMetrics.fetchTime}ms:`, error);
      cloudImages = [];
    }

    // 确保 cloudImages 是数组
    if (!Array.isArray(cloudImages)) {
      console.warn('云存储返回的不是数组，将使用空数组');
      cloudImages = [];
    }

    // 格式化图片数据
    const formatStartTime = Date.now();
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

    perfMetrics.formatTime = Date.now() - formatStartTime;
    console.log(`格式化 ${formattedCloudImages.length} 张图片数据完成，耗时: ${perfMetrics.formatTime}ms`);

    // 同步缓存
    const syncCacheStartTime = Date.now();
    await syncCache(localImages, formattedCloudImages);
    perfMetrics.syncTime = Date.now() - syncCacheStartTime;
    console.log(`同步缓存完成，耗时: ${perfMetrics.syncTime}ms`);
    
    // 计算总时间
    perfMetrics.totalTime = Date.now() - syncStartTime;
    console.log(`缓存同步全过程完成，总耗时: ${perfMetrics.totalTime}ms，详细指标:`, perfMetrics);
    
    return true;
  } catch (error) {
    // 计算总时间（即使出错也记录）
    perfMetrics.totalTime = Date.now() - syncStartTime;
    console.error(`同步缓存数据失败，总耗时: ${perfMetrics.totalTime}ms:`, error);
    throw error;
  } finally {
    // 无论成功失败，都释放同步锁
    isSyncing = false;
  }
}
