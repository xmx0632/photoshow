'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

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
  
  // 加载图片列表
  const loadImages = async (tag = '') => {
    try {
      setIsLoading(true);
      
      // 构建 API URL
      let url = '/api/images';
      if (tag) {
        url += `?tag=${encodeURIComponent(tag)}`;
      }
      
      // 获取图片列表
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('获取图片列表失败');
      }
      
      const data = await response.json();
      setImages(data.images || []);
    } catch (err) {
      console.error('加载图片失败:', err);
      setError('加载图片失败: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 加载标签列表
  const loadTags = async () => {
    try {
      const response = await fetch('/api/tags');
      
      if (!response.ok) {
        throw new Error('获取标签列表失败');
      }
      
      const data = await response.json();
      setTags(data.tags || []);
    } catch (err) {
      console.error('加载标签失败:', err);
      setError('加载标签失败: ' + err.message);
    }
  };
  
  // 加载存储信息
  const loadStorageInfo = async () => {
    try {
      const response = await fetch('/api/storage');
      
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
      const response = await fetch(`/api/images?fileName=${encodeURIComponent(fileName)}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('删除图片失败');
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
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageId, tag }),
      });
      
      if (!response.ok) {
        throw new Error('添加标签失败');
      }
      
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
      const response = await fetch('/api/tags', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageId, tag }),
      });
      
      if (!response.ok) {
        throw new Error('移除标签失败');
      }
      
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
  
  // 初始加载
  useEffect(() => {
    loadImages();
    loadTags();
    loadStorageInfo();
  }, []);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">图片管理</h1>
      
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
                      JSON.parse(image.metadata.tags).map((tag) => (
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
                    ) : (
                      <span className="text-xs text-gray-500">无标签</span>
                    )}
                  </div>
                  
                  {/* 添加标签 */}
                  <div className="mt-2 flex">
                    <input
                      type="text"
                      placeholder="添加标签..."
                      className="text-sm border rounded px-2 py-1 flex-grow"
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
                      onClick={() => deleteImage(image.key)}
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
    </div>
  );
}
