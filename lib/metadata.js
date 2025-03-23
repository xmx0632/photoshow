/**
 * 图片元数据管理工具
 * 用于存储和检索图片元数据
 */

import fs from 'fs';
import path from 'path';

// 元数据文件路径
const METADATA_FILE = process.env.METADATA_FILE || path.join(process.cwd(), 'data', 'metadata.json');

// 确保数据目录存在
function ensureDataDir() {
  const dataDir = path.dirname(METADATA_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

/**
 * 获取所有图片元数据
 * @returns {Array} 图片元数据数组
 */
export function getAllMetadata() {
  try {
    // 确保服务器端运行
    if (typeof window !== 'undefined') {
      throw new Error('getAllMetadata 只能在服务器端使用');
    }
    
    // 确保数据目录存在
    ensureDataDir();
    
    // 如果元数据文件不存在，创建空文件
    if (!fs.existsSync(METADATA_FILE)) {
      fs.writeFileSync(METADATA_FILE, JSON.stringify([]));
      return [];
    }
    
    // 读取元数据文件
    const data = fs.readFileSync(METADATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('获取元数据失败:', error);
    return [];
  }
}

/**
 * 保存图片元数据
 * @param {Object} metadata - 图片元数据
 * @returns {boolean} 是否保存成功
 */
export function saveMetadata(metadata) {
  try {
    // 确保服务器端运行
    if (typeof window !== 'undefined') {
      throw new Error('saveMetadata 只能在服务器端使用');
    }
    
    // 确保数据目录存在
    ensureDataDir();
    
    // 获取现有元数据
    const allMetadata = getAllMetadata();
    
    // 检查是否已存在相同 ID 的元数据
    const index = allMetadata.findIndex(item => item.id === metadata.id);
    
    if (index !== -1) {
      // 更新现有元数据
      allMetadata[index] = { ...allMetadata[index], ...metadata };
    } else {
      // 添加新元数据
      allMetadata.push(metadata);
    }
    
    // 保存到文件
    fs.writeFileSync(METADATA_FILE, JSON.stringify(allMetadata, null, 2));
    return true;
  } catch (error) {
    console.error('保存元数据失败:', error);
    return false;
  }
}

/**
 * 删除图片元数据
 * @param {string} id - 图片 ID
 * @returns {boolean} 是否删除成功
 */
export function deleteMetadata(id) {
  try {
    // 确保服务器端运行
    if (typeof window !== 'undefined') {
      throw new Error('deleteMetadata 只能在服务器端使用');
    }
    
    // 获取现有元数据
    const allMetadata = getAllMetadata();
    
    // 过滤掉要删除的元数据
    const filteredMetadata = allMetadata.filter(item => item.id !== id);
    
    // 如果没有变化，说明没有找到对应 ID 的元数据
    if (filteredMetadata.length === allMetadata.length) {
      return false;
    }
    
    // 保存到文件
    fs.writeFileSync(METADATA_FILE, JSON.stringify(filteredMetadata, null, 2));
    return true;
  } catch (error) {
    console.error('删除元数据失败:', error);
    return false;
  }
}

/**
 * 获取图片标签列表
 * @returns {Array} 标签列表
 */
export function getAllTags() {
  try {
    // 获取所有元数据
    const allMetadata = getAllMetadata();
    
    // 提取所有标签并去重
    const tagsSet = new Set();
    
    allMetadata.forEach(item => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach(tag => tagsSet.add(tag));
      }
    });
    
    return Array.from(tagsSet);
  } catch (error) {
    console.error('获取标签列表失败:', error);
    return [];
  }
}

/**
 * 添加标签到图片
 * @param {string} id - 图片 ID
 * @param {string} tag - 标签
 * @returns {boolean} 是否添加成功
 */
export function addTagToImage(id, tag) {
  try {
    // 获取所有元数据
    const allMetadata = getAllMetadata();
    
    // 查找对应 ID 的元数据
    const index = allMetadata.findIndex(item => item.id === id);
    
    if (index === -1) {
      return false;
    }
    
    // 获取现有标签
    const metadata = allMetadata[index];
    const tags = metadata.tags || [];
    
    // 如果标签已存在，不重复添加
    if (tags.includes(tag)) {
      return true;
    }
    
    // 添加新标签
    tags.push(tag);
    metadata.tags = tags;
    
    // 更新元数据
    allMetadata[index] = metadata;
    
    // 保存到文件
    fs.writeFileSync(METADATA_FILE, JSON.stringify(allMetadata, null, 2));
    return true;
  } catch (error) {
    console.error('添加标签失败:', error);
    return false;
  }
}

/**
 * 从图片中移除标签
 * @param {string} id - 图片 ID
 * @param {string} tag - 标签
 * @returns {boolean} 是否移除成功
 */
export function removeTagFromImage(id, tag) {
  try {
    // 获取所有元数据
    const allMetadata = getAllMetadata();
    
    // 查找对应 ID 的元数据
    const index = allMetadata.findIndex(item => item.id === id);
    
    if (index === -1) {
      return false;
    }
    
    // 获取现有标签
    const metadata = allMetadata[index];
    const tags = metadata.tags || [];
    
    // 如果标签不存在，直接返回
    if (!tags.includes(tag)) {
      return true;
    }
    
    // 移除标签
    metadata.tags = tags.filter(t => t !== tag);
    
    // 更新元数据
    allMetadata[index] = metadata;
    
    // 保存到文件
    fs.writeFileSync(METADATA_FILE, JSON.stringify(allMetadata, null, 2));
    return true;
  } catch (error) {
    console.error('移除标签失败:', error);
    return false;
  }
}

/**
 * 备份元数据
 * @returns {string} 备份文件路径
 */
export function backupMetadata() {
  try {
    // 确保服务器端运行
    if (typeof window !== 'undefined') {
      throw new Error('backupMetadata 只能在服务器端使用');
    }
    
    // 确保数据目录存在
    ensureDataDir();
    
    // 如果元数据文件不存在，无需备份
    if (!fs.existsSync(METADATA_FILE)) {
      return null;
    }
    
    // 创建备份文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(
      path.dirname(METADATA_FILE),
      `metadata-backup-${timestamp}.json`
    );
    
    // 复制文件
    fs.copyFileSync(METADATA_FILE, backupFile);
    
    return backupFile;
  } catch (error) {
    console.error('备份元数据失败:', error);
    return null;
  }
}

/**
 * 从备份恢复元数据
 * @param {string} backupFile - 备份文件路径
 * @returns {boolean} 是否恢复成功
 */
export function restoreMetadata(backupFile) {
  try {
    // 确保服务器端运行
    if (typeof window !== 'undefined') {
      throw new Error('restoreMetadata 只能在服务器端使用');
    }
    
    // 检查备份文件是否存在
    if (!fs.existsSync(backupFile)) {
      throw new Error('备份文件不存在');
    }
    
    // 确保数据目录存在
    ensureDataDir();
    
    // 复制文件
    fs.copyFileSync(backupFile, METADATA_FILE);
    
    return true;
  } catch (error) {
    console.error('恢复元数据失败:', error);
    return false;
  }
}
