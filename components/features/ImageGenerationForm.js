'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ImageUploader } from './ImageUploader';

/**
 * 图片生成表单组件
 * 用于生成AI图片并上传到云存储
 */
export function ImageGenerationForm() {
  // 状态管理
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [error, setError] = useState(null);
  const [savedImages, setSavedImages] = useState([]);
  
  /**
   * 生成图片
   */
  const generateImage = async () => {
    if (!prompt.trim()) {
      setError('请输入提示词');
      return;
    }
    
    try {
      setIsGenerating(true);
      setError(null);
      
      // 调用图片生成API
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '生成图片失败');
      }
      
      const data = await response.json();
      
      // 设置生成的图片
      setGeneratedImage(data.imageUrl);
    } catch (err) {
      console.error('生成图片失败:', err);
      setError(`生成图片失败: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };
  
  /**
   * 保存图片到本地存储
   */
  const saveImageLocally = () => {
    if (!generatedImage) return;
    
    try {
      // 获取现有保存的图片
      const savedImagesJson = localStorage.getItem('generatedImages') || '[]';
      const currentSavedImages = JSON.parse(savedImagesJson);
      
      // 创建新的图片对象
      const newImage = {
        id: Date.now().toString(),
        prompt,
        imageUrl: generatedImage, // 使用 imageUrl 字段名保持一致
        createdAt: new Date().toISOString(),
      };
      
      // 添加到保存列表
      const updatedSavedImages = [newImage, ...currentSavedImages];
      
      // 更新本地存储
      localStorage.setItem('generatedImages', JSON.stringify(updatedSavedImages));
      
      // 更新状态
      setSavedImages(updatedSavedImages);
      
      // 显示成功消息
      alert('图片已保存到本地');
    } catch (err) {
      console.error('保存图片失败:', err);
      setError(`保存图片失败: ${err.message}`);
    }
  };
  
  /**
   * 处理上传完成
   */
  const handleUploadComplete = (result) => {
    console.log('图片上传成功:', result);
    // 这里可以添加其他逻辑，如更新UI或跳转到图片管理页面
  };
  
  /**
   * 处理上传错误
   */
  const handleUploadError = (errorMessage) => {
    setError(`上传图片失败: ${errorMessage}`);
  };
  
  return (
    <div>
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
      
      {/* 提示词输入 */}
      <div className="mb-4">
        <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          输入提示词
        </label>
        <textarea
          id="prompt"
          rows="4"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          placeholder="描述您想要生成的图片，例如：一只在雪地上奔跑的狼，背景是满月和雪松林"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        ></textarea>
      </div>
      
      {/* 生成按钮 */}
      <button
        onClick={generateImage}
        disabled={isGenerating || !prompt.trim()}
        className={`w-full py-2 px-4 rounded-md text-white font-medium ${
          isGenerating || !prompt.trim() 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isGenerating ? '生成中...' : '生成图片'}
      </button>
      
      {/* 生成的图片 */}
      {generatedImage && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2">生成结果</h3>
          <div className="border rounded-lg overflow-hidden">
            <div className="relative aspect-square max-h-96">
              <Image
                src={generatedImage}
                alt={prompt}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-contain"
              />
            </div>
          </div>
          
          {/* 保存按钮 */}
          <div className="mt-4 flex space-x-2">
            <button
              onClick={saveImageLocally}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              保存到本地
            </button>
          </div>
          
          {/* 上传组件 */}
          <ImageUploader
            imageData={generatedImage}
            prompt={prompt}
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
          />
        </div>
      )}
    </div>
  );
}
