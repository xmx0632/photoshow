/**
 * Supabase 客户端配置
 * 用于连接 Supabase 数据库服务
 * 从环境变量中读取配置信息
 */

import { createClient } from '@supabase/supabase-js';

// 从环境变量中读取 Supabase 配置
// 如果环境变量不存在，则使用默认值
// 注意：在生产环境中应该始终使用环境变量

// 获取 Supabase URL
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://unconfiged.supabase.co';

// 获取 Supabase 匿名密钥
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'unconfiged key';

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 在非生产环境下输出配置信息，便于调试
if (process.env.NODE_ENV !== 'production') {
  console.log('使用 Supabase 配置:', { 
    url: supabaseUrl,
    hasKey: !!supabaseAnonKey 
  });
}

export default supabase;
