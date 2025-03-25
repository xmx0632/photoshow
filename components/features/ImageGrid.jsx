"use client";

import { useState, useEffect } from 'react';
import { ImageCard } from './ImageCard';
import { getAllImages, deleteImage, getStorageUsage } from '../../lib/indexedDB';
import { normalizeImageArray } from '../../lib/imageDataModel';

/**
 * 图片网格组件
 * 用于展示所有生成的图片
 * 
 * @param {Object} props - 组件属性
 * @param {boolean} props.showDeleteButton - 是否显示删除按钮，默认为 false
 * @param {boolean} props.isAdminView - 是否为管理员视图，默认为 false
 */
export function ImageGrid({ showDeleteButton = false, isAdminView = false }) {
  // 状态管理
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 加载保存的图片
  useEffect(() => {
    // 只在客户端执行
    if (typeof window !== 'undefined') {
      const loadImages = async () => {
        try {
          setIsLoading(true);
          
          // 首先尝试从缓存服务获取图片
          try {
            const cacheResponse = await fetch('/api/images/cache');
            if (cacheResponse.ok) {
              const cacheData = await cacheResponse.json();
              if (cacheData.success && cacheData.images && cacheData.images.length > 0) {
                console.log(`从缓存获取到 ${cacheData.images.length} 张图片`);
                
                // 使用标准化的图片数据模型
                const formattedImages = normalizeImageArray(cacheData.images);
                setImages(formattedImages);
                
                // 检查存储空间使用情况
                const usage = await getStorageUsage();
                console.log(`当前存储使用: ${usage.totalSizeMB} MB / 50 MB, ${usage.count} 张图片`);
                
                // 如果接近限制，显示警告
                if (usage.isExceedingLimit) {
                  console.warn('本地存储空间即将用尽，旧图片将被自动清理');
                }
                
                setIsLoading(false);
                return; // 如果缓存获取成功，直接返回
              }
            }
          } catch (cacheError) {
            console.warn('从缓存获取图片失败，将使用备用方案:', cacheError);
          }
          
          // 如果缓存获取失败，则使用原来的方法
          // 从 IndexedDB 加载本地图片
          const localImages = await getAllImages();
          
          // 尝试从云存储加载图片
          let cloudImages = [];
          try {
            // 使用 fetch 请求获取云存储图片
            const response = await fetch('/api/images');
            if (response.ok) {
              const data = await response.json();
              cloudImages = data.images || [];
              
              // 使用标准化的图片数据模型处理云存储图片
              cloudImages = normalizeImageArray(cloudImages.map(img => ({
                id: img.key,
                url: img.url,
                prompt: img.metadata?.prompt || '无提示词',
                createdAt: img.lastModified || new Date().toISOString(),
                isCloudImage: true,
                cloudFileName: img.key,
                metadata: img.metadata
              })));
            }
          } catch (cloudError) {
            console.error('加载云存储图片失败:', cloudError);
          }
          
          // 合并本地和云存储图片，去除重复项
          const mergedImages = mergeAndDeduplicateImages(localImages, cloudImages);
          setImages(mergedImages);
          
          // 同步缓存
          try {
            await fetch('/api/images/cache', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              }
            });
            console.log('缓存同步成功');
          } catch (syncError) {
            console.warn('缓存同步失败:', syncError);
          }
          
          // 检查存储空间使用情况
          const usage = await getStorageUsage();
          console.log(`当前存储使用: ${usage.totalSizeMB} MB / 50 MB, ${usage.count} 张图片`);
          
          // 如果接近限制，显示警告
          if (usage.isExceedingLimit) {
            console.warn('本地存储空间即将用尽，旧图片将被自动清理');
          }
        } catch (error) {
          console.error('加载图片失败:', error);
        } finally {
          setIsLoading(false);
        }
      };
      
      loadImages();
    }
  }, []);
  
  /**
   * 合并本地和云存储图片，去除重复项
   * 优先保留本地图片，如果本地没有才显示云存储图片
   */
  const mergeAndDeduplicateImages = (localImages, cloudImages) => {
    // 创建一个集合来跟踪已处理的云存储文件名
    const processedCloudFileNames = new Set();
    // 创建一个集合来跟踪已处理的本地图片文件名
    const processedLocalFileNames = new Set();
    const result = [];
    
    // 首先添加所有本地图片
    for (const localImage of localImages) {
      // 记录本地图片文件名
      if (localImage.fileName) {
        processedLocalFileNames.add(localImage.fileName);
      }
      
      // 如果本地图片有云存储信息，记录云存储文件名
      if (localImage.cloudFileName) {
        processedCloudFileNames.add(localImage.cloudFileName);
      }
      
      result.push(localImage);
    }
    
    // 然后添加不在本地的云存储图片
    for (const cloudImage of cloudImages) {
      // 如果这个云存储文件还没有处理过，则添加这张云存储图片
      if (cloudImage.key && 
          !processedCloudFileNames.has(cloudImage.key) && 
          !processedLocalFileNames.has(cloudImage.key)) {
        result.push({
          id: cloudImage.key,  // 使用云存储文件名作为 ID
          prompt: cloudImage.metadata?.prompt || '无提示词',
          imageUrl: cloudImage.url,
          createdAt: cloudImage.lastModified || new Date().toISOString(),
          isCloudImage: true,  // 标记为云存储图片
          cloudFileName: cloudImage.key,
          fileName: cloudImage.key  // 也将云存储文件名作为本地文件名，便于去重
        });
        processedCloudFileNames.add(cloudImage.key);
      }
    }
    
    // 按创建时间排序，最新的在前
    return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  /**
   * 处理图片删除
   * @param {string} imageId - 要删除的图片ID
   */
  const handleDelete = async (imageId) => {
    try {
      // 显示删除中状态
      setIsLoading(true);
      const imageToDelete = images.find(img => img.id === imageId);
      
      if (imageToDelete) {
        // 如果是云存储图片，调用后端统一删除 API
        if (imageToDelete.isCloudImage) {
          try {
            const response = await fetch(`/api/images?fileName=${encodeURIComponent(imageId)}`, {
              method: 'DELETE',
            });
            
            const result = await response.json();
            console.log('删除图片结果:', result);
            
            // 即使是云存储图片，也需要从 IndexedDB 中删除本地记录
            try {
              await deleteImage(imageId);
              console.log('从本地数据库删除图片成功:', imageId);
            } catch (localError) {
              console.warn('从本地数据库删除图片失败:', localError);
            }
          } catch (cloudError) {
            console.error('从云存储删除图片失败:', cloudError);
            throw cloudError; // 向上抛出错误，不更新前端状态
          }
        } else {
          // 从 IndexedDB 中删除本地图片
          await deleteImage(imageId);
        }
      }
      
      // 更新前端状态
      setImages(prevImages => prevImages.filter(image => image.id !== imageId));
      
      // 注意：不再需要额外调用缓存同步 API，因为后端已统一处理
    } catch (error) {
      console.error('删除图片失败:', error);
      // 显示错误提示
      toast.error(`删除图片失败: ${error.message || '未知错误'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 加载中状态
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
        <span className="ml-3">加载中...</span>
      </div>
    );
  }

  // 没有图片时显示提示
  if (images.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          您还没有生成任何图片
        </p>
        <a href="/create" className="btn-primary">
          开始创建
        </a>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {images.map(image => (
        <ImageCard
          key={image.id}
          image={image}
          onDelete={handleDelete}
          showDeleteButton={showDeleteButton}
        />
      ))}
    </div>
  );
}
