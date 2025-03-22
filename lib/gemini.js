/**
 * Gemini API 配置和工具函数
 * 用于与Google Gemini API进行交互，生成图片
 * 临时使用 curl 方式实现，避免 fetch 代理问题
 */

// 动态导入需要的模块，只在服务器端使用
let fs = null;
let childProcess = null;
if (typeof window === 'undefined') {
  // 只在服务器端导入模块
  fs = require('fs');
  childProcess = require('child_process');
}

// 获取API密钥
const apiKey = process.env.GEMINI_API_KEY;

// 检查是否在服务器端运行
if (typeof window === 'undefined') {
  // 这里的代码只会在服务器端运行
  console.log('在服务器端启用代理设置');
  
  // 设置环境变量代理
  // process.env.HTTP_PROXY = 'http://127.0.0.1:7890';
  // process.env.HTTPS_PROXY = 'http://127.0.0.1:7890';
}

/**
 * 使用Gemini API生成图片 (curl实现版本)
 * @param {string} prompt - 用户输入的提示词
 * @returns {Promise<string>} - 返回生成的图片URL或Base64编码的图片数据
 */
export async function generateImage(prompt) {
  try {
    // 确保API密钥存在
    if (!apiKey) {
      throw new Error("Gemini API密钥未设置，请在.env.local文件中配置GEMINI_API_KEY");
    }

    // 检查是否在服务器端
    if (typeof window !== 'undefined' || !childProcess) {
      throw new Error("curl实现方式只能在服务器端使用");
    }

    // 创建临时文件路径
    const tempImagePath = `/tmp/gemini-image-${Date.now()}.png`;
    
    // 清理prompt中的特殊字符，避免命令注入
    const sanitizedPrompt = prompt.replace(/"/g, '\\"').replace(/\$/g, '\\$');
    
    // 构建curl命令
    const curlCommand = `curl -s -X POST \
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${apiKey}" \
      -H "Content-Type: application/json" \
      -d '{
        "contents": [{
          "parts": [
            {"text": "${sanitizedPrompt}"}
          ]
        }],
        "generationConfig":{"responseModalities":["Text","Image"]}
      }' > /tmp/gemini-response.json`;
    
    // 执行curl命令获取完整响应
    console.log("执行curl命令获取API响应...");
    childProcess.execSync(curlCommand, { stdio: 'pipe' });
    
    // 读取响应JSON
    const responseJson = JSON.parse(fs.readFileSync('/tmp/gemini-response.json', 'utf8'));
    
    // 处理响应中的不同部分
    let imageData = null;
    let imageUrl = null;
    
    // 遍历响应中的所有部分
    if (responseJson.candidates && 
        responseJson.candidates[0] && 
        responseJson.candidates[0].content) {
      
      for (const part of responseJson.candidates[0].content.parts) {
        // 处理文本部分
        if (part.text) {
          console.log("生成的文本描述:", part.text);
        } 
        // 处理图像数据部分
        else if (part.inlineData) {
          imageData = part.inlineData.data; // 这是Base64编码的图像数据
          imageUrl = `data:${part.inlineData.mimeType};base64,${imageData}`;
          console.log("成功生成图像数据");
          
          // 可选：将Base64数据保存为图片文件
          fs.writeFileSync(tempImagePath, Buffer.from(imageData, 'base64'));
          console.log(`图片已保存到: ${tempImagePath}`);
        }
      }
    }
    
    // 如果找到了图像数据，返回图像URL
    if (imageUrl) {
      return imageUrl;
    } else {
      throw new Error("未能从API响应中提取图像数据");
    }
  } catch (error) {
    console.error("图片生成失败:", error);
    
    // 提供更详细的错误信息
    let errorMessage = error.message || '未知错误';
    
    // 检查是否是网络连接问题
    if (errorMessage.includes('fetch failed') || errorMessage.includes('ECONNREFUSED')) {
      errorMessage = '无法连接到Gemini API服务器，请检查您的网络连接或代理设置';
    }
    
    // 检查是否是API密钥问题
    if (errorMessage.includes('API key')) {
      errorMessage = 'Gemini API密钥无效或已过期，请检查您的API密钥设置';
    }
    
    throw new Error(`图片生成失败: ${errorMessage}`);
  }
}

/**
 * 保存图片到指定路径（仅在服务器端使用）
 * @param {string} sourcePath - 源文件路径
 * @param {string} targetPath - 目标文件路径
 * @returns {boolean} - 是否保存成功
 */
export function saveImageFile(sourcePath, targetPath) {
  // 仅在服务器端执行
  if (typeof window === 'undefined' && fs) {
    try {
      // 确保目标目录存在
      const targetDir = targetPath.substring(0, targetPath.lastIndexOf('/'));
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      // 复制文件
      fs.copyFileSync(sourcePath, targetPath);
      return true;
    } catch (error) {
      console.error('保存图片文件失败:', error);
      return false;
    }
  }
  return false;
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
