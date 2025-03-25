/**
 * 图片同步 API
 * 将图片数据同步到 Supabase 数据库
 * 使用 IndexedDB 和其他数据源中的图片数据
 */

import { syncAllImagesToSupabase } from '../../../lib/supabaseService';

/**
 * 处理图片同步请求
 * @param {Object} req - HTTP请求对象
 * @param {Object} res - HTTP响应对象
 */
export default async function handler(req, res) {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持 POST 请求' });
  }

  try {
    console.log('开始同步图片数据到 Supabase...');

    // 执行同步操作
    // syncAllImagesToSupabase 函数会从各种数据源获取图片数据
    const result = await syncAllImagesToSupabase();

    // 返回同步结果
    return res.status(200).json({
      success: true,
      message: `成功同步 ${result.succeeded}/${result.total} 张图片到 Supabase`,
      ...result
    });
  } catch (error) {
    console.error('同步图片到 Supabase 失败:', error);
    return res.status(500).json({
      error: '同步图片失败',
      message: error.message
    });
  }
}
