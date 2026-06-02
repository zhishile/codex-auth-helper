# 🔐 Codex 认证助手 (Codex Auth Helper)

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](./extension/manifest.json)
[![Manifest V3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-orange.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Local Only](https://img.shields.io/badge/Security-100%25_Local-green.svg)](#-安全与隐私承诺)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

**Codex 认证助手** 是一款专为 Codex 开发者设计的安全、轻量、高颜值的凭证管理与本地配置备份辅助 Chrome 扩展程序。

通过高度安全的本地沙盒机制，本插件能够帮助您一键将 ChatGPT 登录会话凭证快速安全地导出，并自动转换为符合 Codex 运行规范的 `auth.json` 配置文件。

---

## 🌟 核心特性

- 📡 **智能本地状态检测**：秒级检测并自动对齐当前浏览器的 ChatGPT 授权状态，直观展现头像、邮箱及订阅计划（Free / Plus / Pro）。
- ⏱️ **实时有效期倒计时**：精确读取 Token 失效时间，并在 Popup 界面上提供秒级的生存期实时倒计时。
- ⚙️ **自动化格式合成**：完美实现 JWT 仿真构造，自动生成 Codex 规范所需的 **Synthetic 签名 id_token**，实现无缝鉴权。
- 🔒 **100% 纯本地离线处理**：
  - 核心逻辑基于闭环的浏览器沙盒处理，生成的配置直接以 `data:` URL 触发下载，不留任何临时 Blob 内存漏洞。
  - **绝不经过任何第三方服务器**（零上传接口，数据不上云），完全打消您的隐私顾虑。
- 🎨 **极致美学设计**：精心打磨的毛玻璃拟物化 (Glassmorphism) UI，支持细腻的悬浮过渡、动感 Toast 反馈以及多套主题配色的极速落地页。

---

## 🚀 极速上手

### 1. 开发者模式安装 (本地加载)
1. 下载或克隆本仓库到您的本地电脑。
2. 打开 Chrome 浏览器，在地址栏输入 `chrome://extensions/` 并回车。
3. 在右上角开启 **"开发者模式" (Developer mode)** 开关。
4. 点击左上角的 **"加载已解压的扩展程序" (Load unpacked)**。
5. 选择本仓库中的 `extension` 文件夹（即包含 `manifest.json` 的目录）。
6. 安装完成后，在浏览器工具栏的“拼图”图标中找到 **Codex 认证助手** 并将其固定。

### 2. 导出 `auth.json`
1. 确保您在当前浏览器中已经登录了 [ChatGPT 官网](https://chatgpt.com/)。
2. 点击浏览器右上角的插件图标，打开 **Codex 认证助手** 弹窗。
3. 插件会自动读取已登录的会话。如果未登录，可点击 **一键前往登录**。
4. 状态识别成功后，点击 **生成并保存 auth.json**，即可一键下载已组装完毕的配置文件。

## 🔒 安全与隐私承诺

> [!IMPORTANT]
> 您的身份凭证与 Session 属于极度敏感的用户隐私，**绝对不能泄露或上传到任何服务器**！

- **零敏感数据收集**：本插件绝不收集、上传或转发任何个人隐私及凭证。
- **最小化权限声明**：仅声明 `downloads`（保存文件）与 `https://chatgpt.com/`（安全读取本地会话），杜绝冗余危险行为。
- **彻底的代码闭环**：您可以随时通过浏览器开发者工具 (F12) 检查 `background.js` 和 `popup.js`。没有引入任何外部不可控 CDN 第三方库，所有静态资源均本地打包。

---

## 📜 许可证

本项目基于 [MIT License](LICENSE) 开源，允许任何个人或团队进行自由修改与二次分发，但请务必保留原作者署名及开源协议声明。
