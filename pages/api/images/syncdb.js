/**
 * 数据库同步 API 路由
 * 用于同步删除本地数据库中的图片记录
 */

export default async function handler(req, res) {
  try {
    // 只允许 POST 请求
    if (req.method !== 'POST') {
      return res.status(405).json({ error: '方法不允许' });
    }

    const { imageId } = req.body;

    // 验证图片ID
    if (!imageId) {
      return res.status(400).json({ error: '缺少图片ID参数' });
    }

    // 返回成功响应，实际删除操作会在前端执行
    return res.status(200).json({
      success: true,
      message: `已请求删除本地数据库中的图片: ${imageId}`,
      imageId
    });
  } catch (error) {
    console.error('数据库同步操作失败:', error);
    return res.status(500).json({ error: `操作失败: ${error.message}` });
  }
}
