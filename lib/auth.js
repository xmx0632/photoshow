/**
 * 认证工具库
 * 提供管理员认证相关的功能
 */

// 存储认证信息的本地存储键名
const AUTH_TOKEN_KEY = 'photoshow_admin_token';
const AUTH_EXPIRES_KEY = 'photoshow_admin_expires';

/**
 * 登录函数 - 验证管理员密码并获取令牌
 * @param {string} password - 管理员密码
 * @returns {Promise<{success: boolean, error?: string}>} - 登录结果
 */
export async function login(password) {
  try {
    // 调用认证API
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    });

    const data = await response.json();

    // 如果认证失败，返回错误信息
    if (!response.ok) {
      return {
        success: false,
        error: data.error || '认证失败',
      };
    }

    // 保存认证令牌和过期时间到本地存储
    localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    localStorage.setItem(AUTH_EXPIRES_KEY, data.expiresAt.toString());

    return {
      success: true,
    };
  } catch (error) {
    console.error('登录过程中出错:', error);
    return {
      success: false,
      error: '登录过程中出错',
    };
  }
}

/**
 * 登出函数 - 清除认证信息
 */
export function logout() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_EXPIRES_KEY);
}

/**
 * 检查是否已认证
 * @returns {boolean} - 是否已认证
 */
export function isAuthenticated() {
  // 从本地存储获取令牌和过期时间
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const expiresAt = localStorage.getItem(AUTH_EXPIRES_KEY);

  // 如果没有令牌或过期时间，则未认证
  if (!token || !expiresAt) {
    return false;
  }

  // 检查令牌是否已过期
  const now = Date.now();
  if (now > parseInt(expiresAt, 10)) {
    // 如果已过期，清除认证信息
    logout();
    return false;
  }

  return true;
}

/**
 * 获取认证令牌
 * @returns {string|null} - 认证令牌，如果未认证则返回null
 */
export function getAuthToken() {
  if (!isAuthenticated()) {
    return null;
  }
  return localStorage.getItem(AUTH_TOKEN_KEY);
}
