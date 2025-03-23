'use client';

import { useState } from 'react';
import Image from 'next/image';
import { saveImage } from '../../lib/indexedDB';

/**
 * 图片上传组件
 * 用于将图片上传到 Cloudflare R2 存储
 */
export function ImageUploader({ imageData, prompt, onUploadComplete, onUploadError }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);
  
  /**
   * 上传图片到 R2 存储
   */
  const uploadImage = async () => {
    if (!imageData) {
      onUploadError?.('没有可上传的图片');
      return;
    }
    
    try {
      setIsUploading(true);
      setUploadProgress(10);
      
      // 准备上传数据
      const uploadData = {
        imageUrl: imageData, // 使用 imageUrl 字段名保持一致
        prompt,
        metadata: {
          createdAt: new Date().toISOString(),
          tags: JSON.stringify([]),
        },
      };
      
      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + Math.floor(Math.random() * 10);
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 300);
      
      // 发送上传请求
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(uploadData),
      });
      
      clearInterval(progressInterval);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '上传失败');
      }
      
      // 处理上传结果
      const result = await response.json();
      setUploadProgress(100);
      setUploadedImageUrl(result.url);
      
      // 同时保存到 IndexedDB，确保在浏览图库中也能看到
      if (typeof window !== 'undefined') {
        try {
          const newImage = {
            id: Date.now().toString(),
            prompt,
            imageUrl: imageData,
            createdAt: new Date().toISOString(),
          };
          
          // 保存到 IndexedDB
          await saveImage(newImage);
          console.log('图片已保存到本地存储');
        } catch (err) {
          console.error('保存到本地存储失败:', err);
        }
      }
      
      // 调用完成回调
      onUploadComplete?.(result);
      
      return result;
    } catch (error) {
      console.error('上传图片失败:', error);
      onUploadError?.(error.message || '上传图片失败');
      return null;
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <div className="mt-4">
      {imageData && !uploadedImageUrl && (
        <button
          onClick={uploadImage}
          disabled={isUploading}
          className={`w-full py-2 px-4 rounded-md text-white font-medium ${
            isUploading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isUploading ? '上传中...' : '保存到云存储'}
        </button>
      )}
      
      {isUploading && (
        <div className="mt-2">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-1 text-center">{uploadProgress}%</p>
        </div>
      )}
      
      {uploadedImageUrl && (
        <div className="mt-4 p-4 border border-green-300 bg-green-50 rounded-md">
          <p className="text-green-700 font-medium mb-2">图片已成功上传到云存储！</p>
          <div className="flex items-center justify-between">
            <a
              href={uploadedImageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              查看图片
            </a>
            <a
              href="/manage"
              className="text-blue-600 hover:underline"
            >
              管理所有图片
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
