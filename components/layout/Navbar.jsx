"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { isAuthenticated, logout } from '../../lib/auth';

/**
 * 导航栏组件
 * 提供应用的主要导航功能，响应式设计适配移动端和桌面端
 */
export function Navbar() {
  // 定义Apple风格的导航样式
  const navStyles = {
    container: "bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700",
    logo: "text-xl font-semibold text-apple-blue dark:text-apple-teal",
    link: "text-gray-700 dark:text-gray-300 hover:text-apple-blue dark:hover:text-apple-teal transition-colors",
    activeLink: "text-apple-blue dark:text-apple-teal font-medium",
    button: "bg-apple-blue hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-apple transition-all duration-200 shadow-apple hover:shadow-apple-hover",
    mobileMenuButton: "text-gray-700 dark:text-gray-300 hover:text-apple-blue dark:hover:text-apple-teal",
  };
  // 移动端菜单开关状态
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // 管理员认证状态
  const [isAdmin, setIsAdmin] = useState(false);

  // 切换移动端菜单显示状态
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // 检查管理员认证状态
  useEffect(() => {
    // 初始检查认证状态
    setIsAdmin(isAuthenticated());

    // 监听存储变化，以便在其他标签页登录/登出时更新状态
    const handleStorageChange = (e) => {
      // 当存储中的认证信息变化时更新状态
      if (e && (e.key === 'photoshow_admin_token' || e.key === 'photoshow_admin_expires' || e.key === null)) {
        setIsAdmin(isAuthenticated());
      }
    };

    // 使用自定义事件来同步不同组件之间的认证状态
    const handleAuthEvent = () => {
      setIsAdmin(isAuthenticated());
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth_state_changed', handleAuthEvent);

    // 定期检查认证状态，以处理令牌过期情况
    const interval = setInterval(() => {
      setIsAdmin(isAuthenticated());
    }, 60000); // 每分钟检查一次

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth_state_changed', handleAuthEvent);
      clearInterval(interval);
    };
  }, []);

  // 处理登出
  const handleLogout = () => {
    logout();
    setIsAdmin(false);
    // 触发自定义事件通知其他组件认证状态已变化
    window.dispatchEvent(new Event('auth_state_changed'));
  };

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex justify-between h-16">
          {/* Logo和品牌名称 */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <span className="text-primary-600 dark:text-primary-400 text-2xl font-bold">PhotoShow</span>
            </Link>
          </div>

          {/* 桌面端导航链接 */}
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/" className="px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400">
              首页
            </Link>
            <Link href="/create" className="px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400">
              创建图片
            </Link>
            <Link href="/browse" className="px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400">
              浏览图库
            </Link>
            {isAdmin && (
              <>
                <Link href="/manage" className="px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400">
                  图片管理
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
                >
                  退出登录
                </button>
              </>
            )}
          </div>

          {/* 移动端菜单按钮 */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 focus:outline-none"
              aria-expanded={isMenuOpen}
            >
              <span className="sr-only">打开主菜单</span>
              {/* 汉堡菜单图标 */}
              <svg
                className={`${isMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              {/* 关闭图标 */}
              <svg
                className={`${isMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 移动端菜单 */}
      <div className={`${isMenuOpen ? 'block' : 'hidden'} md:hidden`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <Link href="/" className="block px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
            首页
          </Link>
          <Link href="/create" className="block px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
            创建图片
          </Link>
          <Link href="/browse" className="block px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
            浏览图库
          </Link>
          {isAdmin && (
            <>
              <Link href="/manage" className="block px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                图片管理
              </Link>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                退出登录
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
