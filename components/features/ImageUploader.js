'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { saveImage, updateImageCloudInfo, getAllImages } from '../../lib/indexedDB';
import { isAuthenticated } from '../../lib/auth';

/**
 * 图片上传组件
 * 用于将图片上传到 Cloudflare R2 存储
 */
export function ImageUploader({ imageData, prompt, onUploadComplete, onUploadError }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);
  
  /**
   * 上传图片到 R2 存储，并保存到本地 IndexedDB
   */
  const uploadImage = async () => {
    if (!imageData) {
      onUploadError?.('没有可上传的图片');
      return;
    }
    
    try {
      setIsUploading(true);
      setUploadProgress(10);
      
      // 生成唯一文件名，使用时间戳和随机字符串
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 10);
      const fileName = `${timestamp}-${randomStr}.png`;
      
      // 准备上传数据
      const uploadData = {
        imageUrl: imageData, // 使用 imageUrl 字段名保持一致
        prompt,
        metadata: {
          createdAt: new Date().toISOString(),
          tags: JSON.stringify([]),
          fileName: fileName, // 传递文件名给服务器，保持一致性
        },
      };
      
      // 首先保存到本地 IndexedDB
      try {
        console.log('正在保存图片到本地 IndexedDB...');
        
        // 创建新的图片对象
        const newImage = {
          id: fileName,  // 使用文件名作为 ID
          prompt,
          imageUrl: imageData,
          createdAt: new Date().toISOString(),
          fileName: fileName  // 存储文件名，与云存储保持一致的命名方式
        };
        
        // 保存到 IndexedDB
        await saveImage(newImage);
        console.log('图片已保存到本地 IndexedDB');
      } catch (localSaveError) {
        console.error('保存图片到本地失败:', localSaveError);
        // 继续上传到云存储，不中断流程
      }
      
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
      
      // 更新本地图片的云存储信息
      if (typeof window !== 'undefined') {
        try {
          // 获取所有本地图片
          const images = await getAllImages();
          
          // 首先检查是否已经有相同的图片URL
          const sameUrlImage = images.find(img => img.imageUrl === imageUrl);
          if (sameUrlImage) {
            // 如果找到相同图片URL的图片，直接更新它的云存储信息
            await updateImageCloudInfo(sameUrlImage.id, {
              cloudFileName: result.fileName,  // 云存储文件名
              cloudUrl: result.url,           // 云存储URL
              uploadedAt: new Date().toISOString()
            });
            console.log('直接更新了相同图片URL的图片云存储信息');
            return;
          }
          
          // 如果没有相同图片URL，则找到匹配当前提示词的最新图片
          const matchingImages = images.filter(img => img.prompt === prompt);
          if (matchingImages.length > 0) {
            // 按创建时间排序，选择最新的图片
            matchingImages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            const latestImage = matchingImages[0];
            
            // 更新本地图片的云存储信息
            await updateImageCloudInfo(latestImage.id, {
              cloudFileName: result.fileName,  // 云存储文件名
              cloudUrl: result.url,           // 云存储URL
              uploadedAt: new Date().toISOString()
            });
            
            // 同步缓存
            try {
              await fetch('/api/images/cache', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                }
              });
              console.log('上传图片后缓存同步成功');
            } catch (syncError) {
              console.warn('缓存同步失败:', syncError);
            }
            
            console.log('图片云存储信息已更新到本地');
          } else {
            console.warn(`没有找到提示词为 "${prompt}" 的本地图片，无法更新云存储信息`);
          }
        } catch (err) {
          console.error('更新图片云存储信息失败:', err);
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
          {isUploading ? '保存中...' : '保存图片'}
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
          <p className="text-green-700 font-medium mb-2">图片已成功保存到本地和云存储！</p>
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
              href="/browse"
              className="text-blue-600 hover:underline"
            >
              浏览图库
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
