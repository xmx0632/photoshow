import '../styles/globals.css';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';

export const metadata = {
  title: 'PhotoShow - AI图片生成',
  description: '使用Gemini API生成精美图片的在线平台',
};

/**
 * 应用的根布局组件
 * 包含全局导航栏和页脚
 */
export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
