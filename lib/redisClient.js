'use client';

import { createClient } from 'redis';
import { getRedisUrl } from './config';

/**
 * Redis 客户端工具
 * 用于连接 Upstash Redis 服务，提供缓存功能
 */

// Redis 客户端实例
let redisClient = null;

// 连接 Promise 缓存，避免重复创建连接
let connectionPromise = null;

/**
 * 获取 Redis 客户端实例
 * 如果客户端不存在或未连接，则创建并连接新的客户端
 * 优化了连接管理，减少重复连接尝试
 * @returns {Promise<Object>} Redis 客户端实例
 */
export const getRedisClient = async () => {
  // 如果在客户端环境，不创建 Redis 连接
  if (typeof window !== 'undefined') {
    console.warn('Redis 客户端仅在服务器端可用');
    return null;
  }

  // 如果已经有连接的客户端，直接返回
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }
  
  // 如果正在连接中，等待连接完成
  if (connectionPromise) {
    return connectionPromise;
  }
  
  // 创建新连接
  connectionPromise = (async () => {
    try {
      // 创建新的 Redis 客户端，添加超时设置和重试机制
      redisClient = createClient({
        url: getRedisUrl(),
        socket: {
          connectTimeout: 5000, // 连接超时设置为5秒
          reconnectStrategy: (retries) => {
            // 重试策略：最多重试3次，每次等待时间递增
            if (retries > 3) {
              console.error(`Redis连接失败，已重试${retries}次，停止重试`);
              return false;
            }
            console.log(`Redis连接重试中，第${retries}次尝试...`);
            return Math.min(retries * 500, 3000); // 500ms, 1000ms, 1500ms, ...
          }
        }
      });

      // 错误处理
      redisClient.on('error', (err) => {
        console.error('Redis 连接错误:', err);
        redisClient = null;
        connectionPromise = null;
      });

      // 连接 Redis
      await redisClient.connect();
      
      // 打印详细的连接信息，但隐藏敏感凭证
      const redisUrl = getRedisUrl();
      const maskedUrl = redisUrl.replace(/\/\/(.+?)@/, '\/\/*****@');
      console.log(`Redis 客户端已连接到: ${maskedUrl}`);
      
      // 测试连接是否正常
      try {
        const pingResult = await redisClient.ping();
        console.log(`Redis 连接测试结果: ${pingResult}`);
      } catch (pingError) {
        console.error('Redis 连接测试失败:', pingError);
      }
      return redisClient;
    } catch (error) {
      console.error('Redis 客户端创建失败:', error);
      redisClient = null;
      connectionPromise = null;
      return null;
    }
  })();
  
  return connectionPromise;
};

/**
 * 关闭 Redis 客户端连接
 */
export const closeRedisConnection = async () => {
  if (redisClient && redisClient.isOpen) {
    try {
      await redisClient.quit();
      console.log('Redis 客户端已断开连接');
    } catch (error) {
      console.error('关闭 Redis 连接失败:', error);
    } finally {
      redisClient = null;
    }
  }
};

/**
 * 设置缓存数据
 * @param {string} key - 缓存键
 * @param {any} value - 缓存值
 * @param {number} expireSeconds - 过期时间（秒），默认 24 小时
 * @returns {Promise<boolean>} 是否成功设置
 */
export const setCache = async (key, value, expireSeconds = 86400) => {
  try {
    const client = await getRedisClient();
    if (!client) return false;

    // 将对象转换为 JSON 字符串
    const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
    
    // 设置缓存，并设置过期时间
    await client.set(key, valueStr, { EX: expireSeconds });
    console.log(`Redis缓存已更新: ${key}`);
    return true;
  } catch (error) {
    console.error(`设置缓存失败 [${key}]:`, error);
    return false;
  }
};

/**
 * 获取缓存数据
 * @param {string} key - 缓存键
 * @returns {Promise<any>} 缓存值，如果不存在则返回 null
 */
export const getCache = async (key) => {
  try {
    const client = await getRedisClient();
    if (!client) return null;

    // 获取缓存
    const value = await client.get(key);
    if (!value) return null;

    // 尝试将 JSON 字符串解析为对象
    try {
      return JSON.parse(value);
    } catch (e) {
      // 如果解析失败，返回原始字符串
      return value;
    }
  } catch (error) {
    console.error(`获取缓存失败 [${key}]:`, error);
    return null;
  }
};

/**
 * 删除缓存数据
 * @param {string} key - 缓存键
 * @returns {Promise<boolean>} 是否成功删除
 */
export const deleteCache = async (key) => {
  try {
    const client = await getRedisClient();
    if (!client) return false;

    // 删除缓存
    await client.del(key);
    return true;
  } catch (error) {
    console.error(`删除缓存失败 [${key}]:`, error);
    return false;
  }
};

/**
 * 清空所有缓存数据
 * @returns {Promise<boolean>} 是否成功清空
 */
export const clearAllCache = async () => {
  try {
    const client = await getRedisClient();
    if (!client) return false;

    // 清空所有缓存
    await client.flushAll();
    return true;
  } catch (error) {
    console.error('清空所有缓存失败:', error);
    return false;
  }
};
