'use client';

import { useState, useEffect } from 'react';

/**
 * 缓存配置组件
 * 用于管理缓存类型（文件系统或 Redis）
 */
export function CacheConfig() {
  const [cacheType, setCacheType] = useState('');
  const [availableTypes, setAvailableTypes] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // 获取当前缓存类型
  useEffect(() => {
    const fetchCacheType = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/config/cache-type');
        const data = await response.json();
        
        if (data.success) {
          setCacheType(data.cacheType);
          setAvailableTypes(data.availableTypes);
        } else {
          setError(data.error || '获取缓存类型失败');
        }
      } catch (error) {
        console.error('获取缓存类型失败:', error);
        setError('获取缓存类型失败，请稍后重试');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCacheType();
  }, []);

  // 切换缓存类型
  const handleCacheTypeChange = async (newType) => {
    try {
      setIsLoading(true);
      setMessage('');
      setError('');
      
      const response = await fetch('/api/config/cache-type', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cacheType: newType }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCacheType(data.cacheType);
        setMessage(`缓存类型已切换为: ${data.cacheType}`);
        
        // 同步缓存
        await syncCache();
      } else {
        setError(data.error || '切换缓存类型失败');
      }
    } catch (error) {
      console.error('切换缓存类型失败:', error);
      setError('切换缓存类型失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 同步缓存
  const syncCache = async () => {
    try {
      const response = await fetch('/api/images/cache', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (!data.success) {
        console.warn('同步缓存失败:', data.error);
      }
    } catch (error) {
      console.error('同步缓存失败:', error);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">缓存配置</h2>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div>
          <span className="ml-2">加载中...</span>
        </div>
      ) : (
        <div>
          <div className="mb-4">
            <p className="text-gray-600 dark:text-gray-300 mb-2">
              当前缓存类型: <span className="font-semibold">{cacheType === 'redis' ? 'Redis 缓存' : '文件系统缓存'}</span>
            </p>
            
            <div className="flex space-x-4 mt-4">
              <button
                onClick={() => handleCacheTypeChange('file')}
                disabled={cacheType === 'file' || isLoading}
                className={`px-4 py-2 rounded-md ${
                  cacheType === 'file'
                    ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                使用文件缓存
              </button>
              
              <button
                onClick={() => handleCacheTypeChange('redis')}
                disabled={cacheType === 'redis' || isLoading}
                className={`px-4 py-2 rounded-md ${
                  cacheType === 'redis'
                    ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                使用 Redis 缓存
              </button>
            </div>
          </div>
          
          {message && (
            <div className="p-3 bg-green-100 text-green-700 rounded-md mb-4">
              {message}
            </div>
          )}
          
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-md mb-4">
              {error}
            </div>
          )}
          
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            <p>文件缓存: 将缓存数据保存在服务器文件系统中 (cache.json)</p>
            <p>Redis 缓存: 将缓存数据保存在 Upstash Redis 云服务中</p>
          </div>
        </div>
      )}
    </div>
  );
}
