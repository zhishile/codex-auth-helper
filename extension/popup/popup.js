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

  // 2. 导出 auth.json — 委托给 background service worker 执行下载
  document.getElementById('btn-download').addEventListener('click', () => {
    if (!globalSession) return;
    const authJsonString = generateCodexAuthJson(globalSession);
    
    chrome.runtime.sendMessage({
      action: 'download_auth_json',
      jsonContent: authJsonString
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('下载通信异常:', chrome.runtime.lastError);
        showToast('❌ 下载失败，请重新尝试');
        return;
      }
      if (response && response.success) {
        showToast('🎉 auth.json 已开始下载');
      } else {
        showToast('❌ 下载失败，请重新尝试');
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
 * 核心转换逻辑：将获取到的 ChatGPT Session 数据转化为符合 Codex 要求的 auth.json 格式
 *
 * id_token 采用合成 JWT（alg: none），payload 尽可能从 Session 数据中补齐所有可用 claims，
 * 结构与 auth.openai.com 签发的真实 id_token 对齐。
 *
 * refresh_token 优先级：
 *   1. Session API 响应中的 refreshToken（rt.1.xxx OAuth 格式，少数情况下可能返回）
 *   2. __Secure-next-auth.session-token Cookie 值
 *   3. 空字符串
 *
 * ⚠️ 已知限制：ChatGPT Web Session API 不直接暴露 auth.openai.com 签发的 RS256 id_token
 *   和 rt.1.xxx 格式 refresh_token，因此 id_token 只能合成为占位格式，refresh_token
 *   降级为 Session Cookie。Codex 刷新 token 可能失败，届时需重新导出 auth.json。
 */
function generateCodexAuthJson(session) {
  const accountId = session.account?.id || '';
  const email = session.user?.email || '';
  const planType = session.account?.planType || 'free';
  const userId = session.user?.id || '';
  const userName = session.user?.name || '';
  const authProvider = session.authProvider || '';
  const iat = Math.floor(Date.now() / 1000);
  const exp = session.expires ? Math.floor(new Date(session.expires).getTime() / 1000) : iat + (30 * 24 * 3600);

  // 构建 https://api.openai.com/auth 命名空间下的 claims
  const openaiAuthClaims = {
    chatgpt_account_id: accountId,
    chatgpt_plan_type: planType,
    chatgpt_user_id: userId,
    user_id: userId,
    groups: [],
    localhost: true
  };

  // 若 Session 中包含 organizations 数据则一并加入
  if (session.account?.organizations) {
    openaiAuthClaims.organizations = session.account.organizations;
  }
  if (session.account?.organization) {
    openaiAuthClaims.organization = session.account.organization;
  }
  if (session.account?.plan_type) {
    openaiAuthClaims.chatgpt_plan_type = session.account.plan_type;
  }

  // 构建 id_token Payload（与 auth.openai.com 签发的真实 id_token 结构对齐）
  var jwtPayload = {
    iss: 'https://auth.openai.com',
    iat: iat,
    exp: exp,
    email: email,
    'https://api.openai.com/auth': openaiAuthClaims
  };

  // 补齐可从 Session 中获取的身份 claims
  if (userName) {
    jwtPayload.name = userName;
  }
  if (authProvider) {
    jwtPayload.auth_provider = authProvider;
  }
  if (session.user?.iat) {
    jwtPayload.auth_time = session.user.iat;
  }
  if (session.user?.email_verified !== undefined) {
    jwtPayload.email_verified = session.user.email_verified;
  }

  // 若有真实的 idToken 则直接使用（极少数情况下 Session API 可能包含）
  var idToken = session.idToken || session.id_token;

  if (!idToken) {
    // 合成 id_token: header.claims.synthetic 格式
    var base64UrlEncode = function (obj) {
      var str = JSON.stringify(obj);
      var base64 = btoa(unescape(encodeURIComponent(str)));
      return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    };

    var jwtHeader = { alg: 'none', typ: 'JWT', cpa_synthetic: true };
    idToken = base64UrlEncode(jwtHeader) + '.' + base64UrlEncode(jwtPayload) + '.synthetic';
  }

  // refresh_token 优先级: API 返回 > Cookie 兜底 > 空字符串
  var refreshToken = session.refreshToken || '';

  var authConfig = {
    auth_mode: 'chatgpt',
    OPENAI_API_KEY: null,
    tokens: {
      id_token: idToken,
      access_token: session.accessToken,
      refresh_token: refreshToken,
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
