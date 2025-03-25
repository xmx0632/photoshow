/**
 * 测试图片同步到 Supabase 的功能
 */

// 使用 fetch 调用同步 API
async function testSync() {
  try {
    console.log('开始测试同步功能...');
    
    // 调用同步 API
    const response = await fetch('http://localhost:3000/api/images/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // 解析响应
    const result = await response.json();
    
    // 输出结果
    console.log('同步结果:', result);
    
    if (result.success) {
      console.log('✅ 同步成功!');
    } else {
      console.log('❌ 同步失败:', result.error);
    }
  } catch (error) {
    console.error('测试过程中出错:', error);
  }
}

// 执行测试
testSync();
