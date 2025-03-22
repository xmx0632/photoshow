import { ImageGenerationForm } from '../../components/features/ImageGenerationForm';

/**
 * 图片生成页面
 * 提供用户创建AI生成图片的界面
 */
export default function CreatePage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">创建图片</h1>
      
      <div className="mb-8">
        <p className="text-gray-600 dark:text-gray-300">
          输入详细的提示词描述，让AI为您生成独特的图片。提示词越详细，生成的图片效果越好。
        </p>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <ImageGenerationForm />
      </div>
      
      <div className="mt-12">
        <h2 className="text-2xl font-semibold mb-4">提示词技巧</h2>
        <ul className="list-disc pl-5 space-y-2 text-gray-600 dark:text-gray-300">
          <li>使用具体的描述词，如颜色、形状、材质等</li>
          <li>描述光照条件，如"阳光明媚"、"月光下"等</li>
          <li>指定艺术风格，如"水彩画风格"、"赛博朋克风格"等</li>
          <li>添加环境描述，如"在森林中"、"城市街道上"等</li>
          <li>避免使用过于抽象或模糊的词语</li>
        </ul>
      </div>
    </div>
  );
}
