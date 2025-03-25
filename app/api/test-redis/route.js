/**
 * Redis 连接测试 API
 * 用于测试 Redis 连接和缓存功能
 */

import { getCache, setCache } from '../../../lib/redisClient';
import { getCurrentCacheType, CACHE_TYPES } from '../../../lib/cacheManager';

/**
 * 处理测试请求
 * @returns {Response} 测试结果
 */
export async function GET() {
  try {
    // 测试键和值
    const testKey = 'photoshow:test:redis';
    const testValue = {
      timestamp: new Date().toISOString(),
      message: '这是一个测试值'
    };
    
    // 记录当前缓存类型
    const cacheType = getCurrentCacheType();
    console.log(`当前缓存类型: ${cacheType}`);
    
    let result = {
      success: false,
      cacheType,
      testKey,
      testValue,
      getResult: null,
      setResult: null,
      error: null
    };
    
    if (cacheType === CACHE_TYPES.REDIS) {
      // 设置测试值
      console.log(`正在设置测试值: ${testKey}`);
      const setResult = await setCache(testKey, testValue, 60); // 60秒过期
      console.log(`设置结果: ${setResult}`);
      result.setResult = setResult;
      
      // 获取测试值
      console.log(`正在获取测试值: ${testKey}`);
      const getResult = await getCache(testKey);
      console.log(`获取结果:`, getResult);
      result.getResult = getResult;
      
      result.success = setResult && getResult && getResult.timestamp === testValue.timestamp;
    } else {
      result.error = '当前缓存类型不是 Redis';
    }
    
    return Response.json(result);
  } catch (error) {
    console.error('Redis 测试失败:', error);
    return Response.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
