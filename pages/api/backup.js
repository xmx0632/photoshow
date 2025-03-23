/**
 * 数据备份与恢复 API 路由
 * 处理元数据的备份和恢复操作
 */

import { backupMetadata, restoreMetadata } from '../../lib/metadata';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  try {
    // 根据请求方法处理不同操作
    switch (req.method) {
      case 'POST':
        // 创建备份
        return handleCreateBackup(req, res);
      case 'PUT':
        // 恢复备份
        return handleRestoreBackup(req, res);
      case 'GET':
        // 获取备份列表
        return handleGetBackups(req, res);
      default:
        return res.status(405).json({ error: '方法不允许' });
    }
  } catch (error) {
    console.error('备份操作失败:', error);
    return res.status(500).json({ error: `操作失败: ${error.message}` });
  }
}

/**
 * 处理创建备份请求
 */
function handleCreateBackup(req, res) {
  // 创建备份
  const backupFile = backupMetadata();
  
  if (backupFile) {
    return res.status(200).json({
      success: true,
      message: '备份创建成功',
      backupFile: path.basename(backupFile),
      timestamp: new Date().toISOString(),
    });
  } else {
    return res.status(500).json({ error: '创建备份失败' });
  }
}

/**
 * 处理恢复备份请求
 */
function handleRestoreBackup(req, res) {
  const { backupFile } = req.body;
  
  // 验证必要参数
  if (!backupFile) {
    return res.status(400).json({ error: '缺少备份文件名' });
  }
  
  // 构建完整的备份文件路径
  const dataDir = path.join(process.cwd(), 'data');
  const fullBackupPath = path.join(dataDir, backupFile);
  
  // 恢复备份
  const success = restoreMetadata(fullBackupPath);
  
  if (success) {
    return res.status(200).json({
      success: true,
      message: '备份恢复成功',
      timestamp: new Date().toISOString(),
    });
  } else {
    return res.status(500).json({ error: '恢复备份失败' });
  }
}

/**
 * 处理获取备份列表请求
 */
function handleGetBackups(req, res) {
  try {
    // 获取数据目录
    const dataDir = path.join(process.cwd(), 'data');
    
    // 如果目录不存在，返回空列表
    if (!fs.existsSync(dataDir)) {
      return res.status(200).json({ backups: [] });
    }
    
    // 读取目录内容
    const files = fs.readdirSync(dataDir);
    
    // 过滤出备份文件
    const backups = files
      .filter(file => file.startsWith('metadata-backup-') && file.endsWith('.json'))
      .map(file => {
        // 获取文件信息
        const filePath = path.join(dataDir, file);
        const stats = fs.statSync(filePath);
        
        // 从文件名中提取时间戳
        const timestampMatch = file.match(/metadata-backup-(.+)\.json/);
        const timestamp = timestampMatch ? timestampMatch[1].replace(/-/g, ':') : null;
        
        return {
          filename: file,
          size: stats.size,
          created: stats.birthtime.toISOString(),
          timestamp: timestamp,
        };
      })
      // 按创建时间排序，最新的在前面
      .sort((a, b) => new Date(b.created) - new Date(a.created));
    
    return res.status(200).json({ backups });
  } catch (error) {
    console.error('获取备份列表失败:', error);
    return res.status(500).json({ error: `获取备份列表失败: ${error.message}` });
  }
}
