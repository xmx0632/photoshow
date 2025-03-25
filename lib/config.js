/**
 * 应用配置服务
 * 用于管理应用的各种配置项，包括缓存类型等
 */

// 缓存类型枚举
export const CACHE_TYPES = {
  FILE: 'file',
  REDIS: 'redis'
};

/**
 * 获取当前环境
 * @returns {string} 当前环境 (development, production, test)
 */
export const getEnvironment = () => {
  return process.env.NODE_ENV || 'development';
};

/**
 * 获取缓存类型配置
 * @returns {string} 缓存类型 ('file' 或 'redis')
 */
export const getCacheType = () => {
  // 优先使用环境变量
  const envCacheType = process.env.CACHE_TYPE;
  if (envCacheType && (envCacheType === CACHE_TYPES.FILE || envCacheType === CACHE_TYPES.REDIS)) {
    return envCacheType;
  }
  
  // 默认使用文件缓存
  return CACHE_TYPES.FILE;
};

/**
 * 获取 Redis 连接 URL
 * @returns {string} Redis 连接 URL
 */
export const getRedisUrl = () => {
  return process.env.REDIS_URL || 'rediss://default:password@content-muskrat-111.upstash.io:6379';
};

/**
 * 获取管理员密码
 * @returns {string} 管理员密码
 */
export const getAdminPassword = () => {
  return process.env.ADMIN_PASSWORD || 'admin123';
};

/**
 * 获取应用配置
 * @returns {Object} 应用配置对象
 */
export const getConfig = () => {
  return {
    environment: getEnvironment(),
    cacheType: getCacheType(),
    redisUrl: getRedisUrl(),
    adminPassword: getAdminPassword()
  };
};
