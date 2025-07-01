# 🎵 OSC Bridge - 桌面控制面板

一个基于 Tauri 构建的现代化 OSC（Open Sound Control）桥接工具，专为音频制作和现场演出设计。

![OSC Bridge Logo](https://img.shields.io/badge/OSC-Bridge-blue?style=for-the-badge&logo=music&logoColor=white)
![Tauri](https://img.shields.io/badge/Tauri-FFC131?style=for-the-badge&logo=Tauri&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white)

## 📖 项目简介

OSC Bridge 是一个功能强大的桌面应用程序，它在网页客户端和 OSC 设备（如 REAPER 数字音频工作站）之间建立双向通信桥梁。通过现代化的图形界面，用户可以轻松地发送 OSC 指令、监控设备状态，并实时查看所有通信日志。

### 🎯 核心功能

- **🔄 双向 OSC 通信**：支持发送控制指令和接收状态反馈
- **🖥️ 现代化界面**：深色主题的专业控制面板
- **📊 实时日志监控**：替代传统命令行，提供美观的日志显示
- **⚡ 快速操作**：预设常用的 OSC 指令按钮
- **🔧 自动化启动**：一键启动所有后台服务
- **💾 预设管理**：保存和加载不同场景的配置

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────┐
│              前端界面 (Tauri)                 │
│     HTML + CSS + TypeScript + OSC.js      │
└─────────────────┬───────────────────────────┘
                  │ WebSocket (ws://localhost:9122)
┌─────────────────▼───────────────────────────┐
│           OSC 桥接服务 (Node.js)             │
│        Express + WebSocket Server          │
└─────────┬───────────────────────────┬───────┘
          │ UDP:7878, 9223 (发送)     │ UDP:7879, 9222 (接收)
          ▼                           ▼
┌─────────────────────────────────────────────┐
│              REAPER DAW                    │
│           OSC 控制端点                      │
└─────────────────────────────────────────────┘
```

## 🚀 功能特性

### 🎛️ 控制面板
- **OSC 消息发送**：自定义地址和参数
- **快速操作按钮**：播放、停止、录制、静音等
- **参数类型支持**：数字、字符串、布尔值自动识别

### 📋 实时日志
- **方向指示**：清晰区分发送 (→) 和接收 (←) 的消息
- **时间戳**：精确到秒的消息时间记录
- **颜色编码**：不同类型消息使用不同颜色显示
- **自动滚动**：可选的自动滚动到最新消息

### 🔌 连接状态
- **实时状态指示器**：绿色/红色指示灯显示连接状态
- **端口信息显示**：监听和转发端口的实时显示
- **自动重连**：连接断开时自动尝试重连

## 🛠️ 安装与使用

### 环境要求

- **Node.js** (v16 或更高版本)
- **Rust** (最新稳定版)
- **操作系统**：Windows 10/11, macOS, Linux

### 快速开始

1. **克隆项目**
   ```bash
   git clone https://github.com/your-username/osc-bridge.git
   cd osc-bridge
   ```

2. **安装依赖**
   ```bash
   npm install
   cd sidecar && npm install && cd ..
   ```

3. **开发模式运行**
   ```bash
   npm run tauri dev
   ```

4. **构建生产版本**
   ```bash
   npm run tauri build
   ```

### 📦 打包发布

构建完成后，可执行文件将生成在 `src-tauri/target/release/` 目录中：

- **Windows**: `osc-bridge.exe`
- **macOS**: `osc-bridge.app`
- **Linux**: `osc-bridge`

## 🎮 使用指南

### 基本操作

1. **启动应用**：双击可执行文件，应用会自动启动后台服务
2. **发送 OSC 消息**：
   - 在"OSC 地址"输入框中输入目标地址（如 `/track/1/volume`）
   - 在"参数"输入框中输入参数值（如 `0.75`）
   - 点击"发送 OSC 消息"按钮
3. **使用快速按钮**：点击预设的快速操作按钮（播放、停止等）
4. **查看日志**：右侧日志面板会实时显示所有通信记录

### 高级功能

- **清除日志**：点击"清除日志"按钮清空当前日志
- **自动滚动**：勾选"自动滚动"复选框，日志会自动滚动到最新条目
- **预设管理**：通过 HTTP API 保存和加载不同场景的配置

## 🔧 配置说明

### 默认端口配置

| 用途 | 端口 | 协议 | 说明 |
|------|------|------|------|
| WebSocket 服务 | 9122 | TCP | 前端与后台通信 |
| REAPER 控制 | 7878 | UDP | 发送控制指令 |
| REAPER 反馈 | 7879 | UDP | 接收状态反馈 |
| 扩展控制 | 9223 | UDP | 额外控制端口 |
| 脚本反馈 | 9222 | UDP | REAPER 脚本反馈 |

### 预设存储

预设文件默认保存在：`C:/Web/Vue/Reaper Web/presets/`

可通过以下 API 进行管理：
- **保存预设**：`POST /presets/{name}`
- **读取预设**：`GET /presets/{name}`

## 🎨 界面预览

### 主界面
```
┌─────────────────────────────────────────────────────────────┐
│ ● WebSocket: 已连接  📡 监听: 7879,9222  🎯 目标: 7878,9223   │
├─────────────────┬───────────────────────────────────────────┤
│   控制面板       │              实时日志                      │
│                │                                           │
│ OSC 地址:       │ [14:30:25] → 发送 OSC | /track/1/volume   │
│ /track/1/volume │ [14:30:25] ← 接收 OSC | /track/1/fader_db │
│                │ [14:30:26] → 发送 OSC | /play             │
│ 参数:           │ [14:30:26] ← 接收 OSC | /time/str         │
│ 0.75           │                                           │
│                │                                           │
│ [发送 OSC 消息]  │                                           │
│                │                                           │
│ 快速操作:       │                                           │
│ [停止] [播放]   │                                           │
│ [录制] [静音]   │                                           │
└─────────────────┴───────────────────────────────────────────┘
```

## 🤝 贡献指南

我们欢迎所有形式的贡献！

1. **Fork** 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 **Pull Request**

## 📝 更新日志

### v1.0.0 (2025-01-07)
- ✨ 初始版本发布
- 🎯 基本的 OSC 双向通信功能
- 🖥️ 现代化的桌面界面
- 📊 实时日志监控系统
- ⚡ 快速操作按钮
- 💾 预设管理功能

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [Tauri](https://tauri.app/) - 现代化的桌面应用框架
- [OSC.js](https://github.com/adzialocha/osc-js) - JavaScript OSC 库
- [Express](https://expressjs.com/) - Node.js Web 框架
- [WebSocket](https://github.com/websockets/ws) - WebSocket 实现

---

<div align="center">

**如果这个项目对你有帮助，请给它一个 ⭐！**

[🐛 报告问题](https://github.com/your-username/osc-bridge/issues) • [💡 功能建议](https://github.com/your-username/osc-bridge/issues) • [📖 文档](https://github.com/your-username/osc-bridge/wiki)

</div>
