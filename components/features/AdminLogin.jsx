"use client";

import { useState } from 'react';
import { login } from '../../lib/auth';

/**
 * 管理员登录组件
 * 提供管理员密码验证界面
 * @param {Object} props - 组件属性
 * @param {Function} props.onLoginSuccess - 登录成功回调函数
 */
export function AdminLogin({ onLoginSuccess }) {
  // 状态管理
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 处理登录
  const handleLogin = async (e) => {
    e.preventDefault();
    
    // 验证输入
    if (!password.trim()) {
      setError('请输入管理员密码');
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      
      // 调用登录函数
      const result = await login(password);
      
      if (result.success) {
        // 登录成功，调用回调函数
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      } else {
        // 登录失败，显示错误信息
        setError(result.error || '密码错误');
      }
    } catch (err) {
      console.error('登录过程中出错:', err);
      setError('登录过程中出错，请稍后再试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-white">管理员登录</h2>
      
      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      <form onSubmit={handleLogin}>
        <div className="mb-4">
          <label 
            htmlFor="password" 
            className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            管理员密码
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="请输入管理员密码"
            disabled={isLoading}
          />
        </div>
        
        <button
          type="submit"
          className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          {isLoading ? '登录中...' : '登录'}
        </button>
      </form>
    </div>
  );
}
