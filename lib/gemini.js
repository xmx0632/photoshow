import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Gemini API 配置和工具函数
 * 用于与Google Gemini API进行交互，生成图片
 */

// 初始化Gemini API客户端
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

/**
 * 使用Gemini API生成图片
 * @param {string} prompt - 用户输入的提示词
 * @returns {Promise<string>} - 返回生成的图片URL
 */
export async function generateImage(prompt) {
  try {
    // 确保API密钥存在
    if (!apiKey) {
      throw new Error("Gemini API密钥未设置，请在.env.local文件中配置GEMINI_API_KEY");
    }

    // 使用Gemini Pro Vision模型
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
    
    // 发送生成请求
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 2048,
      },
    });

    // 处理响应
    const response = result.response;
    const text = response.text();
    
    // 从响应中提取图片URL
    // 注意：这里的实现可能需要根据实际API返回格式调整
    const imageUrl = extractImageUrlFromResponse(text);
    
    return imageUrl;
  } catch (error) {
    console.error("图片生成失败:", error);
    throw new Error(`图片生成失败: ${error.message}`);
  }
}

/**
 * 从API响应中提取图片URL
 * 注意：此函数实现需要根据实际API返回格式调整
 * @param {string} responseText - API返回的响应文本
 * @returns {string} - 提取的图片URL
 */
function extractImageUrlFromResponse(responseText) {
  // 这里是一个示例实现，实际情况可能需要根据API返回格式调整
  // 假设API返回的是一个包含图片URL的JSON字符串
  try {
    const data = JSON.parse(responseText);
    return data.imageUrl;
  } catch (error) {
    // 如果不是JSON格式，尝试直接从文本中提取URL
    const urlMatch = responseText.match(/(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif))/i);
    if (urlMatch) {
      return urlMatch[0];
    }
    
    // 如果无法提取URL，返回一个占位图片
    return "https://via.placeholder.com/512x512?text=Image+Generation+Failed";
  }
}

/**
 * 保存生成的图片到本地存储
 * @param {string} prompt - 用户输入的提示词
 * @param {string} imageUrl - 生成的图片URL
 * @returns {Promise<void>}
 */
export function saveGeneratedImage(prompt, imageUrl) {
  // 获取当前存储的图片列表
  const savedImages = JSON.parse(localStorage.getItem('generatedImages') || '[]');
  
  // 创建新的图片记录
  const newImage = {
    id: Date.now().toString(),
    prompt,
    imageUrl,
    createdAt: new Date().toISOString(),
  };
  
  // 将新图片添加到列表中
  savedImages.unshift(newImage);
  
  // 保存更新后的列表到本地存储
  localStorage.setItem('generatedImages', JSON.stringify(savedImages));
}

/**
 * 获取保存的图片列表
 * @returns {Array} - 保存的图片列表
 */
export function getSavedImages() {
  // 从本地存储获取图片列表
  return JSON.parse(localStorage.getItem('generatedImages') || '[]');
}

/**
 * 删除保存的图片
 * @param {string} imageId - 要删除的图片ID
 * @returns {void}
 */
export function deleteImage(imageId) {
  // 获取当前存储的图片列表
  const savedImages = JSON.parse(localStorage.getItem('generatedImages') || '[]');
  
  // 过滤掉要删除的图片
  const updatedImages = savedImages.filter(image => image.id !== imageId);
  
  // 保存更新后的列表到本地存储
  localStorage.setItem('generatedImages', JSON.stringify(updatedImages));
}
