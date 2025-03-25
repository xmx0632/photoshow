import { checkGenerationLimit } from '../../../lib/generationLimitService';

/**
 * 获取图片生成限制状态
 * @returns {Response} - 包含生成限制信息的响应
 */
export async function GET() {
    try {
        // 获取生成限制状态
        const generationStatus = await checkGenerationLimit();

        // 返回成功响应
        return new Response(
            JSON.stringify({
                limit: generationStatus.limit,
                currentCount: generationStatus.currentCount,
                remaining: generationStatus.remaining
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        // 在服务器端记录详细错误信息供调试
        console.error('获取生成限制状态失败:', error);

        // 判断环境，在开发环境中提供详细错误信息
        const isDevelopment = process.env.NODE_ENV === 'development';

        // 准备错误响应
        const errorResponse = isDevelopment
            ? {
                error: '获取生成限制状态失败',
                message: error.message || '未知错误',
                stack: error.stack,
                details: '[调试信息] 详细错误信息仅在开发环境中显示'
            }
            : {
                error: '获取生成限制状态失败，请稍后再试'
            };

        // 返回错误响应
        return new Response(
            JSON.stringify(errorResponse),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}