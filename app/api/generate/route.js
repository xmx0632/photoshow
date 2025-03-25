import { generateImage } from '../../../lib/gemini';

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
    
    // 调用Gemini API生成图片
    const imageUrl = await generateImage(prompt);
    
    // 返回成功响应
    return new Response(
      JSON.stringify({ imageUrl }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
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
