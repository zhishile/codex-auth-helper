// background.js — Service Worker 异步获取 Session 数据 + 文件下载
// 符合 Manifest V3 最佳实践，避免全局状态丢失

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fetch_session') {
    // 异步执行请求
    fetchChatGPTSession()
      .then(sessionData => {
        sendResponse({ success: true, data: sessionData });
      })
      .catch(error => {
        console.error('获取 ChatGPT Session 失败:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // 重要：保持异步通信通道开启
  }

  if (message.action === 'download_auth_json') {
    // 在 Service Worker 进程中执行下载，完全独立于 Popup 生命周期
    const dataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(message.jsonContent);
    chrome.downloads.download({
      url: dataUrl,
      filename: 'auth.json',
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('下载异常:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, downloadId: downloadId });
      }
    });
    return true; // 保持异步通信通道开启
  }
});

/**
 * 跨域请求 ChatGPT Session 接口
 * 由于在 manifest.json 中声明了 https://chatgpt.com/ 的 host_permissions，
 * Service Worker 可以在后台安全且不受跨域同源策略(CORS)限制地发起此请求。
 */
async function fetchChatGPTSession() {
  const response = await fetch('https://chatgpt.com/api/auth/session', {
    method: 'GET',
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error('UNAUTHORIZED');
  }

  if (!response.ok) {
    throw new Error(`HTTP 异常，状态码: ${response.status}`);
  }

  const data = await response.json();
  
  // 校验是否获取到了合法的 accessToken，若为空或未定义则判定为未登录
  if (!data || !data.accessToken) {
    throw new Error('UNAUTHORIZED');
  }

  return data;
}
