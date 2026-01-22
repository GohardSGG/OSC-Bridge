import './styles.css'
import App from './App.svelte'
import { invoke } from '@tauri-apps/api/core';

// Disable default right-click menu
document.addEventListener('contextmenu', event => event.preventDefault());

let app;

// Global error handler for runtime errors (like missing components)
window.onerror = function (message, source, lineno, colno, error) {
  alert("RUNTIME ERROR:\n" + message + "\n\nSource: " + source + ":" + lineno + ":" + colno + "\n\nStack:\n" + (error?.stack || "No stack trace"));
};

window.onunhandledrejection = function (event) {
  alert("UNHANDLED PROMISE REJECTION:\n" + event.reason);
};

try {
  const target = document.getElementById('app');
  if (!target) {
    throw new Error("Could not find app container");
  }

  app = new App({
    target,
  })

  // 通知后端前端已就绪，可以关闭 splash 并显示主窗口
  invoke('app_ready').catch(console.error);
} catch (e: any) {
  alert("CRITICAL FRONTEND ERROR:\n" + e.toString() + "\n\nStack:\n" + e.stack);
  console.error(e);
}

export default app
