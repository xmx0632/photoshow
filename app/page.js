/**
 * 首页组件
 * 展示应用简介和主要功能入口
 */
export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <h1 className="text-4xl font-bold text-center mb-6">
        欢迎使用 PhotoShow
      </h1>
      <p className="text-xl text-center mb-8 max-w-2xl">
        基于 AI 技术的智能图片生成平台，让创意变为现实
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mt-8">
        <a
          href="/create"
          className="card p-6 hover:shadow-lg transition-shadow duration-300"
        >
          <h2 className="text-2xl font-semibold mb-4">创建图片</h2>
          <p className="text-gray-600 dark:text-gray-300">
            输入提示词，使用 Gemini AI 生成独特的图片作品
          </p>
        </a>

        <a
          href="/browse"
          className="card p-6 hover:shadow-lg transition-shadow duration-300"
        >
          <h2 className="text-2xl font-semibold mb-4">浏览图库</h2>
          <p className="text-gray-600 dark:text-gray-300">
            查看您之前生成的所有图片作品
          </p>
        </a>
      </div>

      <div className="mt-16 max-w-3xl text-center">
        <h3 className="text-2xl font-semibold mb-4">如何使用</h3>
        <ol className="text-left space-y-3">
          <li className="flex items-start">
            <span className="bg-primary-500 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5">1</span>
            <span>前往"创建图片"页面，输入详细的提示词描述</span>
          </li>
          <li className="flex items-start">
            <span className="bg-primary-500 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5">2</span>
            <span>点击生成按钮，等待 AI 创建您的图片</span>
          </li>
          <li className="flex items-start">
            <span className="bg-primary-500 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5">3</span>
            <span>生成完成后，您可以查看、下载或保存图片</span>
          </li>
        </ol>
      </div>
    </div>
  );
}
