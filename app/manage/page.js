'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { isAuthenticated as checkIsAuthenticated, logout } from '../../lib/auth';
import { AdminLogin } from '../../components/features/AdminLogin';
import { CacheConfig } from '../../components/admin/CacheConfig';

/**
 * 图片管理页面
 * 提供图片列表、标签管理和存储监控功能
 */
export default function ManagePage() {
  // 状态管理
  const [images, setImages] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState('');
  const [storageInfo, setStorageInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  // 加载图片列表
  const loadImages = async (tag = '') => {
    try {
      setIsLoading(true);
      
      // 先尝试使用缓存 API 获取图片
      // 添加时间戳参数避免浏览器缓存
      const timestamp = new Date().getTime();
      let url = `/api/images/cache?_=${timestamp}`;
      
      // 获取图片列表，添加缓存控制头
      const response = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error('获取缓存图片列表失败');
      }
      
      const data = await response.json();
      let imagesList = data.images || [];
      
      // 格式化图片数据，兼容缓存 API 和原始 API 的不同格式
      imagesList = imagesList.map(image => {
        // 提取文件名，用于标签管理
        const fileName = image.fileName || image.cloudFileName || 
                        (image.id && image.id.includes('.') ? image.id : null);
        
        return {
          // 兼容两种格式
          key: image.key || image.id || image.fileName || image.cloudFileName,
          url: image.url || image.imageUrl,
          lastModified: image.lastModified || image.createdAt,
          // 保存原始文件名和ID信息，用于标签管理
          fileName: fileName,
          cloudFileName: image.cloudFileName,
          originalId: image.id,
          metadata: {
            // 如果有 metadata 就使用，否则创建新的 metadata 对象
            ...image.metadata,
            // 如果没有 metadata.prompt 但有独立的 prompt 字段，则使用它
            prompt: image.metadata?.prompt || image.prompt || '无提示词',
            // 确保标签字段存在
            tags: image.metadata?.tags || image.tags || '[]'
          }
        };
      });
      
      // 如果指定了标签，过滤结果
      if (tag) {
        console.log(`正在筛选标签: "${tag}"`);
        imagesList = imagesList.filter(image => {
          // 处理不同格式的标签数据
          let tags = [];
          
          if (image.metadata?.tags) {
            // 如果标签是字符串（JSON格式），尝试解析
            if (typeof image.metadata.tags === 'string') {
              try {
                tags = JSON.parse(image.metadata.tags);
              } catch (e) {
                console.warn('解析标签JSON失败:', e, image.metadata.tags);
                // 如果解析失败但是字符串包含标签，也认为匹配
                return image.metadata.tags.includes(tag);
              }
            } else if (Array.isArray(image.metadata.tags)) {
              // 如果已经是数组，直接使用
              tags = image.metadata.tags;
            }
          } else if (image.tags) {
            // 兼容直接在图片对象上的标签
            if (typeof image.tags === 'string') {
              try {
                tags = JSON.parse(image.tags);
              } catch (e) {
                console.warn('解析图片标签JSON失败:', e);
                return image.tags.includes(tag);
              }
            } else if (Array.isArray(image.tags)) {
              tags = image.tags;
            }
          }
          
          console.log(`图片 ${image.key || image.id} 的标签:`, tags);
          const hasTag = Array.isArray(tags) && tags.includes(tag);
          console.log(`图片 ${image.key || image.id} ${hasTag ? '包含' : '不包含'}标签 "${tag}"`);
          return hasTag;
        });
        console.log(`筛选后剩余 ${imagesList.length} 张图片`);
      }
      
      setImages(imagesList);
    } catch (err) {
      console.error('加载图片失败:', err);
      setError('加载图片失败: ' + err.message);
      
      // 如果缓存 API 失败，尝试使用原始 API
      try {
        // 构建原始 API URL
        let fallbackUrl = '/api/images';
        if (tag) {
          fallbackUrl += `?tag=${encodeURIComponent(tag)}`;
        }
        
        const fallbackResponse = await fetch(fallbackUrl);
        
        if (!fallbackResponse.ok) {
          throw new Error('获取图片列表失败');
        }
        
        const fallbackData = await fallbackResponse.json();
        // 格式化原始 API 返回的图片数据
        const formattedImages = (fallbackData.images || []).map(image => ({
          key: image.key || image.id || image.fileName || image.cloudFileName,
          url: image.url || image.imageUrl,
          lastModified: image.lastModified || image.createdAt,
          metadata: {
            ...image.metadata,
            prompt: image.metadata?.prompt || image.prompt || '无提示词',
            tags: image.metadata?.tags || image.tags || '[]'
          }
        }));
        setImages(formattedImages);
        setError(null); // 清除错误，因为回退方案成功了
      } catch (fallbackErr) {
        console.error('回退方案也失败:', fallbackErr);
        // 保留原始错误
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // 加载标签列表
  const loadTags = async () => {
    try {
      // 从 Supabase 获取标签，添加时间戳避免浏览器缓存
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/tags-supabase-only?_=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error('获取标签列表失败');
      }
      
      const data = await response.json();
      const tags = data.tags || [];
      console.log('从 Supabase 获取到标签:', tags);
      
      setTags(tags);
    } catch (err) {
      console.error('加载标签失败:', err);
      setError('加载标签失败: ' + err.message);
    }
  };
  
  // 加载存储信息
  const loadStorageInfo = async () => {
    try {
      // 添加时间戳避免浏览器缓存
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/storage?_=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error('获取存储信息失败');
      }
      
      const data = await response.json();
      setStorageInfo(data);
    } catch (err) {
      console.error('加载存储信息失败:', err);
      setError('加载存储信息失败: ' + err.message);
    }
  };
  
  // 删除图片
  const deleteImage = async (fileName) => {
    if (!confirm('确定要删除这张图片吗？此操作不可撤销。')) {
      return;
    }
    
    try {
      // 删除图片
      const response = await fetch(`/api/images?fileName=${encodeURIComponent(fileName)}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('删除图片失败');
      }
      
      // 删除成功后，同步缓存
      try {
        // 调用缓存同步 API
        const syncResponse = await fetch('/api/images/cache', {
          method: 'POST',
        });
        
        if (syncResponse.ok) {
          console.log('缓存同步成功');
        } else {
          console.warn('缓存同步失败');
        }
      } catch (syncErr) {
        console.warn('缓存同步出错:', syncErr);
      }
      
      // 重新加载图片列表
      loadImages(selectedTag);
      // 更新存储信息
      loadStorageInfo();
    } catch (err) {
      console.error('删除图片失败:', err);
      setError('删除图片失败: ' + err.message);
    }
  };
  
  // 添加标签
  const addTag = async (imageId, tag) => {
    try {
      console.log('正在添加标签，图片ID:', imageId, '标签:', tag);
      
      // 查找图片对象
      const image = images.find(img => img.key === imageId);
      if (!image) {
        throw new Error('找不到图片信息');
      }
      
      // 输出图片完整信息便于调试
      console.log('图片完整信息:', JSON.stringify(image, null, 2));
      
      // 确定正确的图片ID
      // 优先使用 IndexedDB 中的 ID，因为这是本地存储的原始 ID
      let effectiveImageId;
      
      // 从各种可能的属性中提取有效ID
      if (image.originalId && image.originalId.includes('.png')) {
        // 使用 IndexedDB 中的原始 ID
        effectiveImageId = image.originalId;
      } else if (image.fileName) {
        // 使用文件名
        effectiveImageId = image.fileName;
      } else if (image.cloudFileName) {
        // 使用云存储文件名
        effectiveImageId = image.cloudFileName;
      } else {
        // 其他情况使用 key
        effectiveImageId = image.key;
      }
      
      console.log('使用有效图片ID:', effectiveImageId);
      
      // 直接使用 Supabase 添加标签，不再检查本地元数据文件
      console.log('直接使用 Supabase 添加标签，图片ID:', effectiveImageId);
      
      // 仅使用 Supabase 添加标签
      const response = await fetch('/api/tags-supabase-only', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageId: effectiveImageId, tag }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '添加标签失败');
      }
      
      const result = await response.json();
      console.log('标签添加成功:', result);
      
      // 重新加载图片和标签
      loadImages(selectedTag);
      loadTags();
    } catch (err) {
      console.error('添加标签失败:', err);
      setError('添加标签失败: ' + err.message);
    }
  };
  
  // 移除标签
  const removeTag = async (imageId, tag) => {
    try {
      // 仅使用 Supabase 删除标签
      const response = await fetch('/api/tags-supabase-only', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageId, tag }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '删除标签失败');
      }
      
      const result = await response.json();
      console.log('标签删除成功:', result);
      
      // 重新加载图片和标签
      loadImages(selectedTag);
      loadTags();
    } catch (err) {
      console.error('移除标签失败:', err);
      setError('移除标签失败: ' + err.message);
    }
  };
  
  // 创建备份
  const createBackup = async () => {
    try {
      const response = await fetch('/api/backup', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('创建备份失败');
      }
      
      const data = await response.json();
      alert(`备份创建成功: ${data.backupFile}`);
    } catch (err) {
      console.error('创建备份失败:', err);
      setError('创建备份失败: ' + err.message);
    }
  };
  
  // 同步图片数据到 Supabase
  const syncImagesToSupabase = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/images/sync', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('同步图片到 Supabase 失败');
      }
      
      const data = await response.json();
      alert(`同步完成: 成功同步 ${data.succeeded}/${data.total} 张图片到 Supabase`);
      
      // 重新加载标签
      loadTags();
    } catch (err) {
      console.error('同步图片失败:', err);
      setError('同步图片失败: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 执行自动清理
  const runAutoCleanup = async () => {
    if (!confirm('确定要执行自动清理吗？这将删除最旧的图片文件。')) {
      return;
    }
    
    try {
      const response = await fetch('/api/storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ strategy: 'oldest', limit: 10 }),
      });
      
      if (!response.ok) {
        throw new Error('自动清理失败');
      }
      
      const data = await response.json();
      alert(`清理完成: 已删除 ${data.cleaned} 个文件，释放了 ${data.deletedSizeMB} MB 空间`);
      
      // 重新加载图片列表和存储信息
      loadImages(selectedTag);
      loadStorageInfo();
    } catch (err) {
      console.error('自动清理失败:', err);
      setError('自动清理失败: ' + err.message);
    }
  };
  
  // 处理标签筛选
  const handleTagFilter = (tag) => {
    setSelectedTag(tag);
    loadImages(tag);
  };
  
  // 检查管理员认证状态
  useEffect(() => {
    const checkAuth = () => {
      setIsAdmin(checkIsAuthenticated());
      setIsCheckingAuth(false);
    };
    
    checkAuth();
    
    // 监听存储变化，以便在其他标签页登录/登出时更新状态
    const handleStorageChange = () => {
      checkAuth();
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  // 初始加载数据（仅在认证成功后）
  useEffect(() => {
    // 如果正在检查认证状态，不执行任何操作
    if (isCheckingAuth) return;
    
    // 如果未认证，不加载数据
    if (!isAdmin) return;
    
    // 使用独立的加载函数，避免重复请求
    const initialLoad = async () => {
      try {
        setIsLoading(true);
        
        // 并行请求，减少总加载时间
        await Promise.all([
          loadImages(),
          loadTags(),
          loadStorageInfo()
        ]);
        
        console.log('所有数据加载完成');
      } catch (error) {
        console.error('初始加载数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initialLoad();
    
    // 添加定时刷新机制，每5分钟自动更新一次存储信息
    const refreshInterval = setInterval(() => {
      console.log('定时刷新存储信息...');
      loadStorageInfo();
    }, 5 * 60 * 1000); // 5分钟
    
    // 组件卸载时清除定时器
    return () => clearInterval(refreshInterval);
  }, [isAdmin, isCheckingAuth]);
  
  // 处理登录成功
  const handleLoginSuccess = () => {
    setIsAdmin(true);
    // 触发自定义事件通知其他组件认证状态已变化
    window.dispatchEvent(new Event('auth_state_changed'));
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">图片管理</h1>
      
      {/* 认证检查 */}
      {isCheckingAuth ? (
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2">检查认证状态...</p>
        </div>
      ) : !isAdmin ? (
        <div>
          <p className="mb-6 text-center text-gray-700 dark:text-gray-300">
            此页面需要管理员权限才能访问。请输入管理员密码登录。
          </p>
          <AdminLogin onLoginSuccess={handleLoginSuccess} />
        </div>
      ) : (
        <>
      
      {/* 错误提示 */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
          <button 
            className="underline ml-2"
            onClick={() => setError(null)}
          >
            关闭
          </button>
        </div>
      )}
      
      {/* 存储信息 */}
      {storageInfo && (
        <div className="bg-gray-100 p-4 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-2">存储使用情况</h2>
          <div className="flex items-center mb-2">
            <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
              <div 
                className={`h-2.5 rounded-full ${storageInfo.quota.isWarning ? 'bg-red-500' : 'bg-blue-500'}`} 
                style={{ width: `${Math.min(storageInfo.quota.usagePercentage, 100)}%` }}
              ></div>
            </div>
            <span className="text-sm font-medium">
              {storageInfo.quota.usagePercentage.toFixed(1)}%
            </span>
          </div>
          <p className="text-sm">
            已使用: {storageInfo.quota.usedMB.toFixed(2)} MB / {storageInfo.quota.totalMB} MB
            ({storageInfo.usage.objectCount} 个文件)
          </p>
          <div className="mt-3 flex space-x-2">
            <button 
              onClick={createBackup}
              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
            >
              创建备份
            </button>
            <button 
              onClick={syncImagesToSupabase}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
            >
              同步到云端
            </button>
            <button 
              onClick={runAutoCleanup}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm"
              disabled={!storageInfo.quota.isWarning}
            >
              自动清理
            </button>
          </div>
        </div>
      )}
      
      {/* 标签筛选 */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">标签筛选</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleTagFilter('')}
            className={`px-3 py-1 rounded text-sm ${
              selectedTag === '' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            全部
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => handleTagFilter(tag)}
              className={`px-3 py-1 rounded text-sm ${
                selectedTag === tag ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
      
      {/* 图片列表 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">图片列表 ({images.length})</h2>
        
        {/* 缓存配置组件 */}
        <CacheConfig />
        
        {isLoading ? (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-2">加载中...</p>
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-lg">
            <p className="text-gray-500">没有找到图片</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <div key={image.key} className="border rounded-lg overflow-hidden bg-white shadow-sm">
                {/* 图片预览 */}
                <div className="relative aspect-square">
                  <Image
                    src={image.url}
                    alt={image.metadata?.prompt || '生成的图片'}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover"
                    unoptimized={true} // 避免 Next.js 对外部图片的优化问题
                  />
                </div>
                
                {/* 图片信息 */}
                <div className="p-3">
                  <p className="text-sm text-gray-700 line-clamp-2 h-10">
                    {image.metadata?.prompt || '无提示词'}
                  </p>
                  
                  {/* 标签 */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {image.metadata?.tags ? (
                      (() => {
                        try {
                          const parsedTags = typeof image.metadata.tags === 'string' 
                            ? JSON.parse(image.metadata.tags)
                            : Array.isArray(image.metadata.tags) ? image.metadata.tags : [];
                          
                          return parsedTags.length > 0 
                            ? parsedTags.map((tag) => (
                                <span key={tag} className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">
                                  {tag}
                                  <button
                                    onClick={() => removeTag(image.key, tag)}
                                    className="ml-1 text-red-500 hover:text-red-700"
                                  >
                                    &times;
                                  </button>
                                </span>
                              ))
                            : <span className="text-xs text-gray-500">无标签</span>;
                        } catch (e) {
                          console.error('解析标签失败:', e, image.metadata.tags);
                          return <span className="text-xs text-gray-500">标签格式错误</span>;
                        }
                      })()
                    ) : (
                      <span className="text-xs text-gray-500">无标签</span>
                    )}
                  </div>
                  
                  {/* 添加标签 */}
                  <div className="mt-2 flex">
                    <input
                      type="text"
                      placeholder="添加标签..."
                      className="text-sm border rounded px-2 py-1 flex-grow text-gray-900 dark:text-white"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.target.value.trim()) {
                          addTag(image.key, e.target.value.trim());
                          e.target.value = '';
                        }
                      }}
                    />
                  </div>
                  
                  {/* 操作按钮 */}
                  <div className="mt-3 flex justify-between">
                    <button
                      onClick={() => {
                        // 获取正确的文件名用于删除
                        const fileName = image.key || 
                                         image.fileName || 
                                         image.cloudFileName || 
                                         (image.url && image.url.split('/').pop().split('?')[0]);
                        if (fileName) {
                          deleteImage(fileName);
                        } else {
                          console.error('无法获取图片文件名', image);
                          setError('无法删除图片：文件名不存在');
                        }
                      }}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      删除
                    </button>
                    <span className="text-xs text-gray-500">
                      {new Date(image.lastModified).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* 已将退出按钮移至导航栏 */}
        </>
      )}
    </div>
  );
}
