/**
 * 管理员认证API
 * 用于验证管理员密码，返回认证令牌
 */
export default async function handler(req, res) {
  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    // 从请求体中获取密码
    const { password } = req.body;
    
    // 从环境变量中获取管理员密码
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    // 如果环境变量中没有设置管理员密码，返回错误
    if (!adminPassword) {
      console.error('环境变量中未设置管理员密码');
      return res.status(500).json({ error: '服务器配置错误：未设置管理员密码' });
    }
    
    // 验证密码
    if (password !== adminPassword) {
      return res.status(401).json({ error: '密码错误' });
    }
    
    // 生成一个简单的认证令牌（实际应用中应使用更安全的方法）
    // 这里使用当前时间戳和密码的组合，并进行Base64编码
    const timestamp = Date.now();
    const token = Buffer.from(`${timestamp}:${adminPassword}`).toString('base64');
    
    // 返回认证成功和令牌
    return res.status(200).json({ 
      success: true, 
      token,
      // 设置令牌过期时间为24小时
      expiresAt: timestamp + 24 * 60 * 60 * 1000
    });
  } catch (error) {
    console.error('认证过程中出错:', error);
    return res.status(500).json({ error: '服务器内部错误' });
  }
}
