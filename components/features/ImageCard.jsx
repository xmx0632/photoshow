"use client";

/**
 * 图片卡片组件
 * 用于展示单张生成的图片及其相关信息
 * 
 * @param {Object} props - 组件属性
 * @param {Object} props.image - 图片数据对象
 * @param {Function} props.onDelete - 删除图片的回调函数
 * @param {boolean} props.showDeleteButton - 是否显示删除按钮，默认为 true
 */
export function ImageCard({ image, onDelete, showDeleteButton = true }) {
  // 格式化日期
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="card overflow-hidden transition-shadow duration-300 hover:shadow-lg">
      {/* 图片预览 */}
      <div className="relative aspect-w-1 aspect-h-1">
        <img
          src={image.imageUrl || image.url}
          alt={image.prompt}
          className="object-cover w-full h-full"
          loading="lazy"
        />
      </div>
      
      {/* 图片信息 */}
      <div className="p-4">
        <h3 className="text-lg font-medium line-clamp-1 mb-2" title={image.prompt}>
          {image.prompt}
        </h3>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          {formatDate(image.createdAt)}
        </p>
        
        {/* 操作按钮 */}
        <div className={`flex ${showDeleteButton ? 'justify-between' : 'justify-end'} mt-2`}>
          <a
            href={image.imageUrl || image.url}
            download="generated-image.png"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 dark:text-primary-400 hover:underline text-sm"
          >
            下载
          </a>
          
          {showDeleteButton && (
            <button
              onClick={() => onDelete(image.id)}
              className="text-red-600 dark:text-red-400 hover:underline text-sm"
              aria-label="删除图片"
            >
              删除
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
