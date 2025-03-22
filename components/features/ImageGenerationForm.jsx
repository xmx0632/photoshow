"use client";

import { useState } from 'react';
import { saveGeneratedImage } from '../../lib/gemini';

/**
 * 图片生成表单组件
 * 用于接收用户输入的提示词并调用API生成图片
 */
export function ImageGenerationForm() {
  // 状态管理
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [generatedImage, setGeneratedImage] = useState(null);
  
  /**
   * 处理表单提交
   * @param {Event} e - 表单提交事件
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 验证提示词
    if (!prompt.trim()) {
      setError('请输入提示词');
      return;
    }
    
    try {
      // 重置状态
      setError('');
      setIsGenerating(true);
      
      // 调用API生成图片
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });
      
      // 处理响应
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '图片生成失败');
      }
      
      // 设置生成的图片
      setGeneratedImage({
        prompt,
        imageUrl: data.imageUrl,
      });
      
      // 保存到本地存储
      if (typeof window !== 'undefined') {
        saveGeneratedImage(prompt, data.imageUrl);
      }
    } catch (err) {
      console.error('图片生成失败:', err);
      setError(err.message || '图片生成失败，请稍后重试');
    } finally {
      setIsGenerating(false);
    }
  };
  
  /**
   * 处理提示词输入变化
   * @param {Event} e - 输入事件
   */
  const handlePromptChange = (e) => {
    setPrompt(e.target.value);
    // 清除错误提示
    if (error) setError('');
  };
  
  /**
   * 重置表单
   */
  const handleReset = () => {
    setPrompt('');
    setGeneratedImage(null);
    setError('');
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="mb-4">
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            提示词
          </label>
          <textarea
            id="prompt"
            name="prompt"
            rows={4}
            value={prompt}
            onChange={handlePromptChange}
            placeholder="描述您想要生成的图片，例如：一只橙色的猫在蓝色的沙发上睡觉，阳光透过窗户照射进来"
            className="input-field"
            disabled={isGenerating}
          />
          {error && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>
        
        <div className="flex space-x-4">
          <button
            type="submit"
            className="btn-primary"
            disabled={isGenerating || !prompt.trim()}
          >
            {isGenerating ? '生成中...' : '生成图片'}
          </button>
          
          <button
            type="button"
            onClick={handleReset}
            className="btn-secondary"
            disabled={isGenerating}
          >
            重置
          </button>
        </div>
      </form>
      
      {/* 生成结果展示 */}
      {isGenerating && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">正在生成图片，请稍候...</p>
        </div>
      )}
      
      {generatedImage && !isGenerating && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">生成结果</h3>
          <div className="card p-4">
            <div className="aspect-w-1 aspect-h-1 mb-4">
              <img
                src={generatedImage.imageUrl}
                alt={generatedImage.prompt}
                className="object-cover rounded-lg shadow-md w-full h-full"
              />
            </div>
            <div className="mt-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">提示词</h4>
              <p className="text-gray-600 dark:text-gray-400">{generatedImage.prompt}</p>
            </div>
            <div className="mt-4 flex justify-end">
              <a
                href={generatedImage.imageUrl}
                download="generated-image.png"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                下载图片
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
