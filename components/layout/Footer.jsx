"use client";

/**
 * 页脚组件
 * 显示应用的版权信息和相关链接
 */
export function Footer() {
  // 获取当前年份
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          {/* 版权信息 */}
          <div className="text-center md:text-left mb-4 md:mb-0">
            <p className="text-gray-600 dark:text-gray-300">
              © {currentYear} PhotoShow. 保留所有权利。
            </p>
          </div>

          {/* 页脚链接 */}
          <div className="flex space-x-6">
            <a
              href="#"
              className="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
            >
              关于我们
            </a>
            <a
              href="#"
              className="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
            >
              使用条款
            </a>
            <a
              href="#"
              className="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
            >
              隐私政策
            </a>
          </div>
        </div>

        {/* 技术栈信息 */}
        <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>基于 Next.js、Tailwind CSS 和 AI 技术构建</p>
        </div>
      </div>
    </footer>
  );
}
