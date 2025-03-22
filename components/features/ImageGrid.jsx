"use client";

import { useState, useEffect } from 'react';
import { ImageCard } from './ImageCard';
import { getSavedImages, deleteImage } from '../../lib/gemini';

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
      try {
        const savedImages = getSavedImages();
        setImages(savedImages);
      } catch (error) {
        console.error('加载图片失败:', error);
      } finally {
        setIsLoading(false);
      }
    }
  }, []);

  /**
   * 处理图片删除
   * @param {string} imageId - 要删除的图片ID
   */
  const handleDelete = (imageId) => {
    try {
      // 从本地存储中删除图片
      deleteImage(imageId);
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
