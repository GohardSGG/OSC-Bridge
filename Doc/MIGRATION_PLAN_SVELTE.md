# OSC Bridge UI Migration Plan: 从原生 JS 到 Svelte

## 1. 目标

本次重构的核心目标是将 OSC Bridge 前端 UI 从现有的原生 TypeScript DOM 操作模式，全面升级为基于 Svelte 和 Tailwind CSS 的现代化组件化架构。我们的最终目标是完美复现 `新的设计.jsx` 中所展示的 UI 和交互，同时建立一个更易于维护、扩展和迭代的开发基础。

## 2. 迁移带来的核心优势

*   **极致的开发体验**: 借助 Vite 和 Svelte 插件，我们将拥有闪电般的热模块替换（HMR），大大提升 UI 调试和迭代的速度。
*   **卓越的可维护性**: Svelte 的组件化思想（`.svelte` 单文件组件）能将 UI、逻辑和样式清晰地分离，告别目前 `main.ts` 中庞大且耦合的代码结构。
*   **更高的性能**: Svelte 是一个编译器，它会在构建时生成高度优化的原生 JavaScript 代码，这意味着更小的打包体积、更快的启动速度和更流畅的运行时性能。
*   **代码更简洁**: Svelte 的语法设计旨在减少模板代码，可以用更少的代码实现更丰富的功能。

## 3. 详细迁移步骤

### 阶段一：环境搭建与项目配置

1.  **安装核心依赖**:
    *   使用 npm 安装 `svelte` 和 `@sveltejs/vite-plugin-svelte`。
    *   安装 Tailwind CSS 及其相关依赖 `tailwindcss`、`postcss` 和 `autoprefixer`。

2.  **配置文件更新**:
    *   **`vite.config.ts`**: 集成 `@sveltejs/vite-plugin-svelte` 插件。
    *   **`tailwind.config.js` & `postcss.config.js`**: 创建并配置 Tailwind CSS，确保它能正确扫描 `.svelte` 文件中的类名。
    *   **`tsconfig.json`**: 调整配置以支持 Svelte 的 TypeScript 语法检查。
    *   **`src/styles.css`**: 初始化 Tailwind CSS 的指令 (`@tailwind base; @tailwind components; @tailwind utilities;`)。

### 阶段二：应用入口改造

1.  **清理 `index.html`**: 移除所有旧的 UI 元素和脚本引用，只保留一个用于挂载 Svelte 应用的根 `<div>` 节点（例如 `<div id="app"></div>`）。
2.  **重写 `src/main.ts`**: 将此文件简化为 Svelte 应用的初始化入口，即 `new App({ target: document.getElementById('app') })`。

### 阶段三：UI 组件化迁移

这是将静态设计转化为动态组件的核心步骤。我们会将 `新的设计.jsx` 拆解为一系列可复用的 Svelte 组件。

*   **根组件**: `src/App.svelte` (作为所有组件的容器)
*   **布局组件**:
    *   `src/lib/components/TopBar.svelte`
    *   `src/lib/components/LeftPanel.svelte`
    *   `src/lib/components/RightPanel.svelte`
*   **功能组件**:
    *   `src/lib/components/Injector.svelte`
    *   `src/lib/components/SystemLog.svelte`
    *   `src/lib/components/TrafficMonitor.svelte`
    *   `src/lib/components/SettingsModal.svelte`
*   **原子/共享组件**:
    *   `src/lib/components/shared/TechInput.svelte`
    *   `src/lib/components/shared/LogLine.svelte`
    *   `src/lib/components/shared/SectionHeader.svelte`

### 阶段四：状态与逻辑重构

我们将把旧 `main.ts` 中的业务逻辑，用 Svelte 的方式重新实现。

1.  **全局状态管理**: 创建 Svelte Stores (`src/lib/stores.ts`) 来管理应用的全局状态，例如：
    *   WebSocket 连接状态
    *   系统日志、发送日志、接收日志的数组
    *   应用配置（监听端口、转发目标等）
    *   UI 状态（如设置窗口是否打开、是否暗黑模式）
2.  **后端通信层**: 创建一个专门的服务模块 (`src/lib/api.ts`) 来封装所有与后端的交互：
    *   初始化和管理 WebSocket 连接。
    *   封装对 Tauri Rust 后端的 `invoke` 调用。
3.  **逻辑注入**: 在相关的 Svelte 组件中，订阅 (subscribe) Stores 来获取和展示数据，并在用户交互时调用 `api.ts` 中的方法来执行操作（如发送 OSC 消息、保存配置）。

### 阶段五：清理与优化

1.  **删除旧代码**: 在所有功能都迁移完成后，安全地删除旧的 `main.ts` 中的 DOM 操作代码和不再需要的函数。
2.  **代码审查**: 检查并确保所有组件都遵循 Svelte 的最佳实践。
3.  **最终测试**: 全面测试应用的所有功能，确保其行为与旧版本一致，并且新 UI 完美呈现。

## 4. 风险评估

*   **逻辑迁移**: `main.ts` 文件中的逻辑较为复杂，迁移过程需要细致，以防遗漏功能。
*   **CSS 兼容性**: 旧的 `styles.css` 中的样式可能需要部分重写或调整，以适应 Tailwind CSS 的工作流。

此计划将指导我们高效、有序地完成此次重要的 UI 升级。
