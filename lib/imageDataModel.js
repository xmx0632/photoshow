/**
 * 图片数据模型
 * 定义系统中使用的统一图片数据格式
 */

/**
 * 标准化图片数据对象
 * 将不同来源的图片数据转换为统一格式
 * 
 * @param {Object} imageData - 原始图片数据
 * @returns {Object} 标准化后的图片数据对象
 */
export function normalizeImageData(imageData) {
  if (!imageData) return null;
  
  return {
    // 基本标识信息
    id: imageData.id || imageData.fileName || imageData.key || `img-${Date.now()}`,
    
    // 图片URL信息
    imageUrl: imageData.imageUrl || imageData.url || imageData.publicUrl,
    url: imageData.url || imageData.imageUrl || imageData.publicUrl,
    publicUrl: imageData.publicUrl || imageData.url || imageData.imageUrl,
    
    // 元数据信息
    prompt: imageData.prompt || imageData.metadata?.prompt || '无提示词',
    createdAt: imageData.createdAt || imageData.metadata?.createdAt || new Date().toISOString(),
    
    // 来源标记
    isCloudImage: imageData.isCloudImage || false,
    
    // 文件名信息
    fileName: imageData.fileName || imageData.id || imageData.key,
    cloudFileName: imageData.cloudFileName || imageData.fileName || imageData.key || imageData.id,
    
    // 保留原始元数据
    metadata: imageData.metadata || {},
    
    // 合并其他属性
    ...Object.entries(imageData)
      .filter(([key]) => !['id', 'imageUrl', 'url', 'publicUrl', 'prompt', 'createdAt', 
                          'isCloudImage', 'fileName', 'cloudFileName', 'metadata'].includes(key))
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
  };
}

/**
 * 批量标准化图片数据
 * 
 * @param {Array} images - 图片数据数组
 * @returns {Array} 标准化后的图片数据数组
 */
export function normalizeImageArray(images) {
  if (!Array.isArray(images)) return [];
  return images.filter(Boolean).map(normalizeImageData);
}
