import { generateImage } from '../../../lib/gemini';
import { checkGenerationLimit, incrementGenerationCount } from '../../../lib/generationLimitService';

/**
 * 处理图片生成API请求
 * @param {Request} request - 请求对象
 * @returns {Response} - 包含生成图片URL的响应
 */
export async function POST(request) {
  try {
    // 解析请求体
    const body = await request.json();
    const { prompt } = body;
    
    // 验证提示词
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return new Response(
        JSON.stringify({ error: '提示词不能为空' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 检查每日生成限制
    const generationStatus = await checkGenerationLimit();
    if (generationStatus.isLimitExceeded) {
      return new Response(
        JSON.stringify({ 
          error: '超过每日图片生成限制',
          limit: generationStatus.limit,
          currentCount: generationStatus.currentCount,
          remaining: 0
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    try {
      // 调用Gemini API生成图片
      const imageUrl = await generateImage(prompt);
      
      // 生成成功后增加计数
      console.log('开始增加生成计数');
      const newCount = await incrementGenerationCount();
      console.log('增加生成计数成功，新计数:', newCount);
      
      // 获取更新后的生成限制信息
      console.log('获取更新后的生成限制信息');
      const updatedLimitInfo = await checkGenerationLimit();
      console.log('更新后的限制信息:', updatedLimitInfo);
      
      // 返回成功响应，包含剩余生成次数信息
      return new Response(
        JSON.stringify({ 
          imageUrl,
          limit: updatedLimitInfo.limit,
          currentCount: updatedLimitInfo.currentCount,
          remaining: updatedLimitInfo.remaining
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('生成图片或更新计数失败:', error);
      throw error; // 向上层抛出错误，由外部的 catch 块处理
    }
  } catch (error) {
    // 在服务器端记录详细错误信息供调试
    console.error('图片生成失败:', error);
    
    // 判断环境，在开发环境中提供详细错误信息
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // 准备错误响应
    let errorResponse;
    
    if (isDevelopment) {
      // 开发环境：提供详细错误信息供调试
      errorResponse = {
        error: '图片生成失败',
        message: error.message || '未知错误',
        stack: error.stack,
        details: '[调试信息] 详细错误信息仅在开发环境中显示'
      };
    } else {
      // 生产环境：只提供简洁的错误信息
      errorResponse = {
        error: '图片生成失败，请稍后再试'
      };
    }
    
    // 返回错误响应
    return new Response(
      JSON.stringify(errorResponse),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
