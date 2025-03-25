/**
 * 图片生成限制服务
 * 用于跟踪和限制每日图片生成数量
 * 使用 Redis 存储每日生成计数，设置 TTL 为 2 天
 */

import { getCache, setCache } from './redisClient';
import { getCurrentCacheType, CACHE_TYPES } from './cacheManager';

// 调试模式，输出详细日志
import util from 'util';
const DEBUG = true;
function debug(...args) {
  if (DEBUG) {
    console.log('[GenerationLimit]', ...args);
    if (args[1] && typeof args[1] === 'object') {
      console.log(util.inspect(args[1], { depth: null, colors: true }));
    }
  }
}

// 获取每日生成限制数量，默认为 50
const DAILY_GENERATION_LIMIT = parseInt(process.env.DAILY_GENERATION_LIMIT || '50', 10);

// Redis 键前缀
const REDIS_KEY_PREFIX = 'photoshow:generation:';

// 缓存过期时间（秒）- 2天
const CACHE_TTL_SECONDS = 2 * 24 * 60 * 60;

/**
 * 获取当前日期的字符串表示 (YYYY-MM-DD)
 * @returns {string} 日期字符串
 */
function getCurrentDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * 获取日期对应的 Redis 键
 * @param {string} dateString - 日期字符串 (YYYY-MM-DD)
 * @returns {string} Redis 键
 */
function getRedisKey(dateString) {
  return `${REDIS_KEY_PREFIX}${dateString}`;
}

/**
 * 获取当日生成计数
 * @returns {Promise<number>} 当日生成计数
 */
export async function getGenerationCount() {
  const today = getCurrentDateString();
  const redisKey = getRedisKey(today);
  
  debug('获取生成计数', { today, redisKey });
  debug('当前缓存类型', getCurrentCacheType());
  
  try {
    // 如果使用 Redis 缓存
    if (getCurrentCacheType() === CACHE_TYPES.REDIS) {
      debug('使用 Redis 缓存获取计数');
      const count = await getCache(redisKey);
      debug('从 Redis 获取的计数', { count, parsed: count ? parseInt(count, 10) : 0 });
      return count ? parseInt(count, 10) : 0;
    } else {
      // 如果使用文件缓存，则不支持此功能
      console.warn('文件缓存模式下不支持精确的生成限制计数，请考虑切换到 Redis 缓存');
      return 0;
    }
  } catch (error) {
    console.error('获取生成计数失败:', error);
    return 0;
  }
}

/**
 * 增加当日生成计数
 * @returns {Promise<number>} 更新后的计数
 */
export async function incrementGenerationCount() {
  const today = getCurrentDateString();
  const redisKey = getRedisKey(today);
  
  debug('增加生成计数', { today, redisKey });
  
  try {
    // 如果使用 Redis 缓存
    if (getCurrentCacheType() === CACHE_TYPES.REDIS) {
      // 获取当前计数
      let count = await getCache(redisKey);
      debug('当前计数', { count, parsed: count ? parseInt(count, 10) : 0 });
      count = count ? parseInt(count, 10) : 0;
      
      // 增加计数
      count += 1;
      debug('增加后的计数', { count });
      
      // 更新 Redis 并设置 TTL
      const result = await setCache(redisKey, count, CACHE_TTL_SECONDS);
      debug('设置缓存结果', { result, ttl: CACHE_TTL_SECONDS });
      
      return count;
    } else {
      // 如果使用文件缓存，则不支持此功能
      console.warn('文件缓存模式下不支持精确的生成限制计数，请考虑切换到 Redis 缓存');
      return 1;
    }
  } catch (error) {
    console.error('增加生成计数失败:', error);
    return 1;
  }
}

/**
 * 检查是否超过每日生成限制
 * @returns {Promise<Object>} 包含当前计数和是否超限的信息
 */
export async function checkGenerationLimit() {
  try {
    // 获取当前计数
    const currentCount = await getGenerationCount();
    
    // 检查是否超过限制
    const isLimitExceeded = currentCount >= DAILY_GENERATION_LIMIT;
    
    return {
      currentCount,
      isLimitExceeded,
      limit: DAILY_GENERATION_LIMIT,
      remaining: Math.max(0, DAILY_GENERATION_LIMIT - currentCount)
    };
  } catch (error) {
    console.error('检查生成限制失败:', error);
    // 出错时返回保守的结果，避免超限
    return {
      currentCount: 0,
      isLimitExceeded: false,
      limit: DAILY_GENERATION_LIMIT,
      remaining: DAILY_GENERATION_LIMIT
    };
  }
}
