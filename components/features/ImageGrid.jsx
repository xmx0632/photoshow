"use client";

import { useState, useEffect } from 'react';
import { ImageCard } from './ImageCard';
import { getAllImages, deleteImage, getStorageUsage } from '../../lib/indexedDB';

/**
 * 图片网格组件
 * 用于展示所有生成的图片
 */
export function ImageGrid() {
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
          
          // 从 IndexedDB 加载图片
          const savedImages = await getAllImages();
          setImages(savedImages);
          
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
   * 处理图片删除
   * @param {string} imageId - 要删除的图片ID
   */
  const handleDelete = async (imageId) => {
    try {
      // 从 IndexedDB 中删除图片
      await deleteImage(imageId);
      // 更新状态
      setImages(prevImages => prevImages.filter(image => image.id !== imageId));
    } catch (error) {
      console.error('删除图片失败:', error);
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
        />
      ))}
    </div>
  );
}
