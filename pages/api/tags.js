/**
 * 标签管理 API 路由
 * 重定向到 tags-supabase-only.js，不再使用本地 metadata.json
 */

export default async function handler(req, res) {
  try {
    // 重定向到 Supabase 标签 API
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/tags-supabase-only`, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });
    
    const data = await response.json();
    
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('标签操作失败:', error);
    return res.status(500).json({ error: `操作失败: ${error.message}` });
  }
}
