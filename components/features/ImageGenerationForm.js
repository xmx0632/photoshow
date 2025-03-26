'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ImageUploader } from './ImageUploader';
import { saveImage, getAllImages, migrateFromLocalStorage } from '../../lib/indexedDB';

/**
 * 图片生成表单组件
 * 用于生成AI图片并上传到云存储
 */
export function ImageGenerationForm() {
  // 状态管理
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [error, setError] = useState(null);
  const [savedImages, setSavedImages] = useState([]);
  // 每日生成限制相关状态
  const [generationLimit, setGenerationLimit] = useState(null);
  const [generationCount, setGenerationCount] = useState(null);

  // 剩余生成次数
  const [remainingGenerations, setRemainingGenerations] = useState(null);

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

      const data = await response.json();

      // 处理每日生成限制信息
      if (data.limit) {
        setGenerationLimit(data.limit);
        setGenerationCount(data.currentCount || 0);
        setRemainingGenerations(data.remaining || 0);
      }

      if (!response.ok) {
        // 如果是超过每日限制的错误
        if (response.status === 429) {
          throw new Error(`超过每日图片生成限制 (每日最多 ${data.limit} 张)`);
        } else {
          throw new Error(data.error || '生成图片失败');
        }
      }

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

  // 获取生成限制状态
  const fetchGenerationStatus = async () => {
    try {
      const response = await fetch('/api/generation-status');
      if (!response.ok) {
        throw new Error('获取生成限制状态失败');
      }
      const data = await response.json();
      setGenerationLimit(data.limit);
      setGenerationCount(data.currentCount);
      setRemainingGenerations(data.remaining);
    } catch (err) {
      console.error('获取生成限制状态失败:', err);
      setError('获取生成限制状态失败');
    }
  };

  // 当组件加载时获取保存的图片和生成限制状态
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);

        // 获取生成限制状态
        await fetchGenerationStatus();

        // 尝试从 localStorage 迁移数据到 IndexedDB
        await migrateFromLocalStorage();

        // 从 IndexedDB 加载图片
        const images = await getAllImages();
        setSavedImages(images);
      } catch (err) {
        console.error('加载初始数据失败:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  return (
    <div>
      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-apple-red text-red-700 px-5 py-4 rounded-apple mb-5 shadow-sm">
          <div className="flex justify-between items-center">
            <p className="font-medium">{error}</p>
            <button
              className="text-apple-red hover:text-red-800 transition-colors ml-3"
              onClick={() => setError(null)}
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* 每日生成限制提示 */}
      <div className="mb-5 flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-3 rounded-apple">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
          每日限制: {generationLimit !== null ? `${generationLimit} 张` : '加载中...'}
        </div>
        <div className={`text-sm font-medium ${remainingGenerations !== null ? (remainingGenerations > 5 ? 'text-apple-green' : 'text-apple-orange') : 'text-gray-400'}`}>
          剩余: {remainingGenerations !== null ? `${remainingGenerations} 张` : '加载中...'}
        </div>
      </div>

      {/* 提示词输入 */}
      <div className="mb-5">
        <label htmlFor="prompt" className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
          输入提示词
        </label>
        <textarea
          id="prompt"
          rows="4"
          className="input-field"
          placeholder="描述您想要生成的图片，例如：一只在雪地上奔跑的狼，背景是满月和雪松林"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        ></textarea>
      </div>

      {/* 生成按钮 */}
      <button
        onClick={generateImage}
        disabled={isGenerating || !prompt.trim() || remainingGenerations <= 0}
        className={`w-full py-3 px-5 rounded-apple text-white font-medium transition-all duration-300 ${isGenerating || !prompt.trim() || remainingGenerations <= 0
          ? 'bg-gray-400 cursor-not-allowed'
          : 'bg-apple-blue hover:bg-blue-600 shadow-apple hover:shadow-apple-hover'
          }`}
      >
        {isGenerating ? '生成中...' :
          remainingGenerations <= 0 ? '今日生成次数已用完' : '生成图片'}
      </button>

      {/* 生成的图片 */}
      {generatedImage && (
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-3 apple-heading">生成结果</h3>
          <div className="border border-gray-200 dark:border-gray-700 rounded-apple overflow-hidden shadow-apple">
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

          {/* 移除了保存到本地按钮，只保留上传到云存储按钮 */}

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
