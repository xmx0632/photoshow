/**
 * 图片生成限制测试 API
 * 用于测试每日生成限制功能是否正常工作
 */

import { checkGenerationLimit, incrementGenerationCount } from '../../../lib/generationLimitService';
import { getCurrentCacheType, CACHE_TYPES } from '../../../lib/cacheManager';

/**
 * 处理测试请求
 * @returns {Response} 测试结果
 */
export async function GET() {
  try {
    // 记录当前缓存类型
    const cacheType = getCurrentCacheType();
    console.log(`当前缓存类型: ${cacheType}`);
    
    // 初始化结果对象
    let result = {
      success: false,
      cacheType,
      initialLimit: null,
      afterIncrement: null,
      error: null
    };
    
    // 检查当前限制状态
    console.log('获取当前生成限制状态');
    const initialLimit = await checkGenerationLimit();
    console.log('当前生成限制状态:', initialLimit);
    result.initialLimit = initialLimit;
    
    // 增加计数
    console.log('增加生成计数');
    const newCount = await incrementGenerationCount();
    console.log('增加后的计数:', newCount);
    
    // 再次检查限制状态
    console.log('获取更新后的生成限制状态');
    const afterIncrement = await checkGenerationLimit();
    console.log('更新后的生成限制状态:', afterIncrement);
    result.afterIncrement = afterIncrement;
    
    // 验证计数是否正确增加
    result.success = afterIncrement.currentCount === initialLimit.currentCount + 1;
    
    return Response.json(result);
  } catch (error) {
    console.error('生成限制测试失败:', error);
    return Response.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
