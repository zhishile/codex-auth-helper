[简体中文](README.md) | **English**

# 🔐 Codex Auth Helper

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](./extension/manifest.json)
[![Manifest V3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-orange.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Local Only](https://img.shields.io/badge/Security-100%25_Local-green.svg)](#-security-and-privacy-commitment)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

**Codex Auth Helper** is a secure, lightweight, and polished Chrome extension designed for Codex developers to help manage credentials and back up local configuration.

Using a highly secure local sandbox, the extension lets you quickly and safely export your ChatGPT login session credentials with one click and automatically converts them into an `auth.json` configuration file that conforms to the Codex runtime format.

---

## 🌟 Core Features

- 📡 **Smart Local Status Detection**: Detects and synchronizes with the browser's current ChatGPT authorization state within seconds, clearly displaying the avatar, email address, and subscription plan (Free / Plus / Pro).
- ⏱️ **Real-Time Expiration Countdown**: Reads the token expiration time precisely and displays a real-time, second-by-second lifetime countdown in the popup.
- ⚙️ **Automated Format Generation**: Implements simulated JWT construction and automatically generates the **Synthetic-signed id_token** required by the Codex format for seamless authentication.
- 🔒 **100% Local Offline Processing**:
  - The core logic runs entirely within a closed browser sandbox. Generated configuration is downloaded directly through a `data:` URL, leaving no temporary Blob memory exposure.
  - **No data ever passes through a third-party server**—there are no upload endpoints, and nothing is sent to the cloud, fully addressing privacy concerns.
- 🎨 **Refined Visual Design**: Features a carefully crafted glassmorphism UI with smooth hover transitions, animated toast feedback, and a fast landing page available in multiple color themes.

---

## 🚀 Quick Start

### 1. Install in Developer Mode (Load Locally)
1. Download or clone this repository to your computer.
2. Open Chrome, enter `chrome://extensions/` in the address bar, and press Enter.
3. Enable the **"Developer mode"** switch in the upper-right corner.
4. Click **"Load unpacked"** in the upper-left corner.
5. Select the `extension` folder in this repository—the folder that contains `manifest.json`.
6. After installation, find **Codex Auth Helper** under the puzzle-piece icon in the browser toolbar and pin it.

### 2. Export `auth.json`
1. Make sure you are already signed in to the [official ChatGPT website](https://chatgpt.com/) in the current browser.
2. Click the extension icon in the upper-right corner of the browser to open the **Codex Auth Helper** popup.
3. The extension automatically reads the signed-in session. If you are not signed in, click **Go to Login**.
4. Once the session is recognized, click **Generate and Save auth.json** to download the assembled configuration file.

## 🔒 Security and Privacy Commitment

> [!IMPORTANT]
> Your identity credentials and session data are extremely sensitive personal information. **They must never be leaked or uploaded to any server!**

- **Zero Sensitive Data Collection**: The extension never collects, uploads, or forwards personal information or credentials.
- **Minimal Permission Declaration**: It requests only `downloads` (to save files) and access to `https://chatgpt.com/` (to securely read the local session), with no unnecessary high-risk permissions.
- **Completely Self-Contained Code Path**: You can inspect `background.js` and `popup.js` at any time with the browser developer tools (F12). No external, uncontrolled CDN libraries are included; all static resources are bundled locally.

---

## 📜 License

This project is open source under the [MIT License](LICENSE). Individuals and teams may freely modify and redistribute it, provided that the original author attribution and open-source license notice are retained.
