// popup.js — Codex 登陆助手核心交互逻辑
// 遵循纯本地处理原则，不存储、不上云

// 缓存全局 Session 数据
let globalSession = null;
let countdownInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  // 初始化界面获取数据
  initSessionFetch();
  
  // 绑定基础事件监听
  bindEvents();
});

/**
 * 初始化 Session 获取
 */
function initSessionFetch() {
  showState('loading');
  
  // 向 background.js 发送请求，发起跨域 fetch
  chrome.runtime.sendMessage({ action: 'fetch_session' }, (response) => {
    // 拦截通道关闭或报错
    if (chrome.runtime.lastError) {
      console.error('通信错误:', chrome.runtime.lastError);
      showState('unauthorized');
      return;
    }

    if (response && response.success) {
      globalSession = response.data;
      renderAuthorizedState(response.data);
      showState('authorized');
    } else {
      showState('unauthorized');
    }
  });
}

/**
 * 切换界面显示状态
 * @param {'loading'|'unauthorized'|'authorized'} state 
 */
function showState(state) {
  const loadingEl = document.getElementById('state-loading');
  const unauthorizedEl = document.getElementById('state-unauthorized');
  const authorizedEl = document.getElementById('state-authorized');

  loadingEl.classList.remove('active');
  unauthorizedEl.classList.remove('active');
  authorizedEl.classList.remove('active');

  if (state === 'loading') {
    loadingEl.classList.add('active');
  } else if (state === 'unauthorized') {
    unauthorizedEl.classList.add('active');
  } else if (state === 'authorized') {
    authorizedEl.classList.add('active');
  }
}

/**
 * 渲染已登录状态的 UI 数据
 */
function renderAuthorizedState(session) {
  const avatarEl = document.getElementById('user-avatar');
  const nameEl = document.getElementById('user-name');
  const emailEl = document.getElementById('user-email');
  const planEl = document.getElementById('badge-plan');
  const expiresEl = document.getElementById('token-expires');

  // 用户个人信息
  const user = session.user || {};
  avatarEl.src = user.image || 'https://lh3.googleusercontent.com/a/default-user=s96-c';
  nameEl.textContent = user.name || 'ChatGPT 用户';
  emailEl.textContent = user.email || '未绑定邮箱';

  // 账户套餐
  const account = session.account || {};
  const planType = (account.planType || 'free').toUpperCase();
  planEl.textContent = planType;
  
  if (planType === 'PLUS' || planType === 'PRO') {
    planEl.className = 'plan-badge plus';
  } else {
    planEl.className = 'plan-badge free';
  }

  // 有效期至
  const expiresTime = session.expires ? new Date(session.expires) : null;
  if (expiresTime) {
    expiresEl.textContent = formatLocalDate(expiresTime);
    // 启动剩余期限实时倒计时
    startCountdown(expiresTime);
  } else {
    expiresEl.textContent = '长期有效';
    document.getElementById('token-countdown').textContent = '无限';
  }
}

/**
 * 绑定所有 DOM 按钮事件
 */
function bindEvents() {
  // 1. 未登录一键跳转
  document.getElementById('btn-login').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://chatgpt.com/' });
    window.close(); // 关闭 popup 窗口
  });

  // 2. 下载 auth.json (采用安全的数据 URL 模式，彻底避免 Blob 临时内存销毁导致的浏览器进程崩溃)
  document.getElementById('btn-download').addEventListener('click', () => {
    if (!globalSession) return;
    const authJsonString = generateCodexAuthJson(globalSession);
    
    // 使用完全闭环、自包含的 Data URL 格式，规避 origin 销毁及 GC 引起的 use-after-free 漏洞
    const dataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(authJsonString);
    
    chrome.downloads.download({
      url: dataUrl,
      filename: 'auth.json',
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('下载遇到异常:', chrome.runtime.lastError);
        showToast('❌ 下载失败，请重新尝试');
      } else {
        showToast('🎉 auth.json 已开始下载');
      }
    });
  });
}

/**
 * 实时计算并更新剩余过期时间倒计时
 */
function startCountdown(expiresTime) {
  if (countdownInterval) clearInterval(countdownInterval);

  const countdownEl = document.getElementById('token-countdown');

  function update() {
    const now = new Date();
    const diff = expiresTime - now;

    if (diff <= 0) {
      countdownEl.textContent = '已过期';
      countdownEl.className = 'detail-value text-danger';
      clearInterval(countdownInterval);
      return;
    }

    // 换算天、小时、分、秒
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    let displayStr = '';
    if (days > 0) displayStr += `${days}天`;
    if (hours > 0 || days > 0) displayStr += `${hours}时`;
    displayStr += `${minutes}分${seconds}秒`;

    countdownEl.textContent = displayStr;
  }

  update();
  countdownInterval = setInterval(update, 1000);
}

/**
 * 格式化输出本地化的年月日 时分秒
 */
function formatLocalDate(date) {
  const pad = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * 核心转换逻辑：将获取到的 ChatGPT Session 数据转化为符合 Codex 要求的格式
 */
function generateCodexAuthJson(session) {
  const accountId = session.account?.id || '';
  const email = session.user?.email || '';
  const planType = session.account?.planType || 'free';
  const iat = Math.floor(Date.now() / 1000);
  const exp = session.expires ? Math.floor(new Date(session.expires).getTime() / 1000) : iat + (30 * 24 * 3600);

  // 1. 构建与原始 JWT 结构对齐的 Synthetic id_token
  // 头部申明无签名 JWT
  const jwtHeader = {
    alg: 'none',
    typ: 'JWT',
    cpa_synthetic: true
  };

  // JWT 核心 Payload，填充 Codex 鉴权所需的全部字段
  const jwtPayload = {
    iat: iat,
    exp: exp,
    "https://api.openai.com/auth": {
      chatgpt_account_id: accountId,
      chatgpt_plan_type: planType,
      chatgpt_user_id: session.user?.id || '',
      user_id: session.user?.id || ''
    },
    email: email
  };

  // Base64Url 编码
  const base64UrlEncode = (obj) => {
    const str = JSON.stringify(obj);
    const base64 = btoa(unescape(encodeURIComponent(str)));
    return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  };

  // 合成无签名形式的 id_token，末尾附加 .synthetic 后缀确保合法辨识
  const syntheticIdToken = `${base64UrlEncode(jwtHeader)}.${base64UrlEncode(jwtPayload)}.synthetic`;

  // 2. 构造目标输出的 auth.json 统一格式
  const authConfig = {
    auth_mode: "chatgpt",
    OPENAI_API_KEY: null,
    tokens: {
      id_token: syntheticIdToken,
      access_token: session.accessToken,
      refresh_token: "",
      account_id: accountId
    },
    last_refresh: new Date().toISOString()
  };

  return JSON.stringify(authConfig, null, 2);
}

/**
 * 一键复制公共方法
 */
function copyToClipboard(text, successMsg) {
  navigator.clipboard.writeText(text)
    .then(() => {
      showToast(successMsg);
    })
    .catch(err => {
      console.error('复制失败:', err);
      showToast('❌ 复制失败，请手动选取');
    });
}

/**
 * 弹出精致轻巧的 Toast 反馈
 */
function showToast(message) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-message');
  
  toastMsg.textContent = message;
  toast.classList.add('show');
  
  // 2秒后淡出
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}
