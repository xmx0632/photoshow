import { setCacheType, getCurrentCacheType, CACHE_TYPES } from '../../../lib/cacheManager';

/**
 * 缓存类型配置 API
 * 用于获取或设置当前使用的缓存类型（文件系统或 Redis）
 */
export default async function handler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        // 获取当前缓存类型
        return res.status(200).json({
          success: true,
          cacheType: getCurrentCacheType(),
          availableTypes: CACHE_TYPES
        });
      case 'POST':
        // 设置缓存类型
        const { cacheType } = req.body;
        
        if (!cacheType) {
          return res.status(400).json({
            success: false,
            error: '缺少 cacheType 参数'
          });
        }
        
        if (cacheType !== CACHE_TYPES.FILE && cacheType !== CACHE_TYPES.REDIS) {
          return res.status(400).json({
            success: false,
            error: `无效的缓存类型: ${cacheType}，可用类型: ${Object.values(CACHE_TYPES).join(', ')}`
          });
        }
        
        // 设置缓存类型
        setCacheType(cacheType);
        
        return res.status(200).json({
          success: true,
          message: `缓存类型已设置为: ${cacheType}`,
          cacheType: getCurrentCacheType()
        });
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ error: `不支持的方法: ${method}` });
    }
  } catch (error) {
    console.error('缓存类型配置 API 错误:', error);
    res.status(500).json({ error: '服务器内部错误', details: error.message });
  }
}
