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
    console.error('图片生成失败:', error);
    
    // 返回错误响应
    return new Response(
      JSON.stringify({ error: error.message || '图片生成失败' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
