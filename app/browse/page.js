import { ImageGrid } from '../../components/features/ImageGrid';

/**
 * 图片浏览页面
 * 展示用户生成的所有图片
 */
export default function BrowsePage() {
  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">图片库</h1>
      
      <div className="mb-8">
        <p className="text-gray-600 dark:text-gray-300">
          浏览您使用AI生成的所有图片。点击图片可以查看详情，您可以下载这些图片。如需管理或删除图片，请联系管理员。
        </p>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <ImageGrid showDeleteButton={false} />
      </div>
    </div>
  );
}
