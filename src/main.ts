import OSC from 'osc-js';

// ===================== 类型定义 =====================
interface LogEntry {
  timestamp: string;
  type: 'sent' | 'received' | 'error' | 'warning' | 'info';
  message: string;
  direction?: '→' | '←';
}

// ===================== 全局变量 =====================
let websocket: WebSocket | null = null;
let isAutoScroll = true;

// DOM 元素引用
let wsStatusIndicator: HTMLElement;
let wsStatusText: HTMLElement;
let sentLogContainer: HTMLElement;
let receivedLogContainer: HTMLElement;
let systemLogContainer: HTMLElement;
let oscAddressInput: HTMLInputElement;
let oscArgsInput: HTMLInputElement;
let autoScrollCheckbox: HTMLInputElement;

// ===================== 初始化 =====================
window.addEventListener('DOMContentLoaded', () => {
  console.log('OSC Bridge 控制面板正在初始化...');
  
  initializeElements();
  setupEventListeners();
  connectWebSocket();
});

function initializeElements() {
  wsStatusIndicator = document.getElementById('ws-status') as HTMLElement;
  wsStatusText = document.getElementById('ws-status-text') as HTMLElement;
  sentLogContainer = document.getElementById('sent-log-container') as HTMLElement;
  receivedLogContainer = document.getElementById('received-log-container') as HTMLElement;
  systemLogContainer = document.getElementById('system-log-container') as HTMLElement;
  oscAddressInput = document.getElementById('osc-address') as HTMLInputElement;
  oscArgsInput = document.getElementById('osc-args') as HTMLInputElement;
  autoScrollCheckbox = document.getElementById('auto-scroll') as HTMLInputElement;

  addSystemLog({
    timestamp: '[启动]',
    type: 'info',
    message: 'OSC Bridge 控制面板已加载，等待连接...'
  });
  
  // 初始化托盘配置
  initTrayConfig();
}

function setupEventListeners() {
  // OSC 发送表单
  const oscForm = document.getElementById('osc-form') as HTMLFormElement;
  oscForm.addEventListener('submit', handleOSCSend);

  // 清除日志按钮
  const clearSentLogBtn = document.getElementById('clear-sent-log') as HTMLButtonElement;
  const clearReceivedLogBtn = document.getElementById('clear-received-log') as HTMLButtonElement;
  const clearSystemLogBtn = document.getElementById('clear-system-log') as HTMLButtonElement;
  clearSentLogBtn.addEventListener('click', () => clearLog('sent'));
  clearReceivedLogBtn.addEventListener('click', () => clearLog('received'));
  clearSystemLogBtn.addEventListener('click', () => clearLog('system'));

  // 自动滚动复选框
  autoScrollCheckbox.addEventListener('change', (e) => {
    isAutoScroll = (e.target as HTMLInputElement).checked;
  });
}

// ===================== WebSocket 连接管理 =====================
function connectWebSocket() {
  addSystemLog({
    timestamp: getCurrentTimestamp(),
    type: 'info',
    message: '正在连接到 OSC Bridge 服务 (ws://localhost:9122)...'
  });

  websocket = new WebSocket('ws://localhost:9122');
  websocket.binaryType = 'arraybuffer';

  websocket.onopen = () => {
    updateConnectionStatus(true);
    addSystemLog({
      timestamp: getCurrentTimestamp(),
      type: 'info',
      message: '✅ WebSocket 连接已建立'
    });
  };

  websocket.onmessage = (event) => {
    // 检查是否是JSON格式的日志消息
    if (typeof event.data === 'string') {
      try {
        const logData = JSON.parse(event.data);
        if (logData.type === 'log') {
          handleLogMessage(logData.message);
          return;
        }
      } catch (e) {
        // 不是JSON，按普通字符串处理
      }
    }
    
    // 处理OSC二进制消息
    handleIncomingOSCMessage(event.data);
  };

  websocket.onclose = () => {
    updateConnectionStatus(false);
    addSystemLog({
      timestamp: getCurrentTimestamp(),
      type: 'warning',
      message: '⚠️ WebSocket 连接已断开，5秒后尝试重连...'
    });
    
    // 5秒后自动重连
    setTimeout(() => {
      if (!websocket || websocket.readyState === WebSocket.CLOSED) {
        connectWebSocket();
      }
    }, 5000);
  };

  websocket.onerror = (error) => {
    addSystemLog({
      timestamp: getCurrentTimestamp(),
      type: 'error',
      message: `❌ WebSocket 连接错误: ${error}`
    });
  };
}

function updateConnectionStatus(connected: boolean) {
  if (connected) {
    wsStatusIndicator.classList.add('connected');
    wsStatusText.textContent = '已连接';
  } else {
    wsStatusIndicator.classList.remove('connected');
    wsStatusText.textContent = '未连接';
  }
}

// ===================== OSC 消息处理 =====================
function handleLogMessage(logMessage: string) {
  // 注意：如果使用浏览器版本(index.html)，这个函数不会被调用
  // 因为浏览器版本有自己的日志处理逻辑
  
  // 解析日志消息的方向，只处理真正的OSC消息
  if (logMessage.includes('→') && (logMessage.includes('转发 OSC') || logMessage.includes('发送 OSC'))) {
    // 发送OSC日志：从WebSocket转发到UDP目标设备
    addOSCLog({
      timestamp: getCurrentTimestamp(),
      type: 'sent',
      direction: '→',
      message: logMessage.replace(/^→\s*/, '') // 移除开头的箭头
    });
  } else if (logMessage.includes('←') && (logMessage.includes('收到 OSC') || logMessage.includes('接收 OSC'))) {
    // 接收OSC日志：从UDP接收OSC消息
    addOSCLog({
      timestamp: getCurrentTimestamp(),
      type: 'received',
      direction: '←',
      message: logMessage.replace(/^←\s*/, '') // 移除开头的箭头
    });
  } else {
    // 其他系统消息放到系统日志
    addSystemLog({
      timestamp: getCurrentTimestamp(),
      type: 'info',
      message: logMessage
    });
  }
}

function handleOSCSend(event: Event) {
  event.preventDefault();
  
  const address = oscAddressInput.value.trim();
  const argsText = oscArgsInput.value.trim();
  
  if (!address) {
    addSystemLog({
      timestamp: getCurrentTimestamp(),
      type: 'error',
      message: '❌ OSC 地址不能为空'
    });
    return;
  }

  if (!websocket || websocket.readyState !== WebSocket.OPEN) {
    addSystemLog({
      timestamp: getCurrentTimestamp(),
      type: 'error',
      message: '❌ WebSocket 未连接，无法发送消息'
    });
    return;
  }

  try {
    // 解析参数
    const args = parseOSCArguments(argsText);
    
    // 创建 OSC 消息
    const message = new OSC.Message(address, ...args);
    const binaryData = message.pack();
    
    // 发送到 WebSocket
    websocket.send(binaryData);
    
    // 记录发送日志到OSC日志区域
    const argsString = args.length > 0 ? args.join(', ') : '(无参数)';
    addOSCLog({
      timestamp: getCurrentTimestamp(),
      type: 'sent',
      direction: '→',
      message: `地址: ${address} | 参数: ${argsString}`
    });
    
  } catch (error) {
    addSystemLog({
      timestamp: getCurrentTimestamp(),
      type: 'error',
      message: `❌ 发送失败: ${error}`
    });
  }
}

function handleIncomingOSCMessage(data: any) {
  // 现在这个函数主要处理二进制OSC数据
  // 日志消息已经通过handleLogMessage处理了
  
  if (typeof data === 'string') {
    // 如果是字符串但不是JSON日志，作为普通消息处理
    addSystemLog({
      timestamp: getCurrentTimestamp(),
      type: 'info',
      message: data
    });
    return;
  }

  // 处理二进制OSC数据（实际的OSC消息转发）
  try {
    const dataView = new DataView(data);
    const message = new OSC.Message('/temp');
    message.unpack(dataView);
    
    if (message.address) {
      // 单个消息 - 这是实际的OSC数据转发，不需要显示在日志中
      // 因为日志已经通过后端的broadcastLog处理了
    } else {
      // OSC Bundle
    }
  } catch (error) {
    // 如果解析失败，记录为警告到系统日志
    addSystemLog({
      timestamp: getCurrentTimestamp(),
      type: 'warning',
      message: `接收到无法解析的二进制消息 (${data.byteLength} 字节)`
    });
  }
}

// ===================== 工具函数 =====================
function parseOSCArguments(argsText: string): any[] {
  if (!argsText) return [];
  
  return argsText.split(',').map(arg => {
    const trimmed = arg.trim();
    
    // 尝试解析为数字
    if (!isNaN(Number(trimmed))) {
      return Number(trimmed);
    }
    
    // 尝试解析为布尔值
    if (trimmed.toLowerCase() === 'true') return true;
    if (trimmed.toLowerCase() === 'false') return false;
    
    // 默认作为字符串
    return trimmed;
  });
}

function getCurrentTimestamp(): string {
  const now = new Date();
  return now.toTimeString().split(' ')[0]; // HH:MM:SS 格式
}

function clearLog(type?: 'sent' | 'received' | 'system') {
  if (type === 'sent') {
    sentLogContainer.innerHTML = '';
    addSystemLog({
      timestamp: getCurrentTimestamp(),
      type: 'info',
      message: '📝 发送日志已清除'
    });
  } else if (type === 'received') {
    receivedLogContainer.innerHTML = '';
    addSystemLog({
      timestamp: getCurrentTimestamp(),
      type: 'info',
      message: '📝 接收日志已清除'
    });
  } else if (type === 'system') {
    systemLogContainer.innerHTML = '';
    addSystemLog({
      timestamp: getCurrentTimestamp(),
      type: 'info',
      message: '📝 系统日志已清除'
    });
  } else {
    // 兼容旧的调用方式
    sentLogContainer.innerHTML = '';
    receivedLogContainer.innerHTML = '';
    addSystemLog({
      timestamp: getCurrentTimestamp(),
      type: 'info',
      message: '📝 日志已清除'
    });
  }
}

// ===================== 日志函数 =====================

// 添加系统日志（启动、连接、错误等）
function addSystemLog(entry: LogEntry) {
  const logElement = createLogElement(entry);
  systemLogContainer.appendChild(logElement);
  
  // 自动滚动到底部
  if (isAutoScroll) {
    systemLogContainer.scrollTop = systemLogContainer.scrollHeight;
  }
  
  // 限制日志条目数量
  limitLogEntries(systemLogContainer);
}

// 添加OSC消息日志（发送/接收的OSC数据）
function addOSCLog(entry: LogEntry) {
  const logElement = createLogElement(entry);
  
  if (entry.direction === '→') {
    sentLogContainer.appendChild(logElement);
    if (isAutoScroll) {
      sentLogContainer.scrollTop = sentLogContainer.scrollHeight;
    }
    limitLogEntries(sentLogContainer);
  } else if (entry.direction === '←') {
    receivedLogContainer.appendChild(logElement);
    if (isAutoScroll) {
      receivedLogContainer.scrollTop = receivedLogContainer.scrollHeight;
    }
    limitLogEntries(receivedLogContainer);
  }
}

// 创建日志元素
function createLogElement(entry: LogEntry): HTMLElement {
  const logElement = document.createElement('div');
  logElement.className = `log-entry ${entry.type}`;
  
  const timestampElement = document.createElement('span');
  timestampElement.className = 'timestamp';
  timestampElement.textContent = entry.timestamp;
  
  const messageElement = document.createElement('span');
  messageElement.className = 'message';
  
  if (entry.direction) {
    const directionElement = document.createElement('span');
    directionElement.className = 'direction-indicator';
    directionElement.textContent = entry.direction;
    messageElement.appendChild(directionElement);
  }
  
  const textNode = document.createTextNode(entry.message);
  messageElement.appendChild(textNode);
  
  logElement.appendChild(timestampElement);
  logElement.appendChild(messageElement);
  
  return logElement;
  }
  
// 限制日志条目数量
function limitLogEntries(container: HTMLElement) {
  const maxLogEntries = 500;
  const logEntries = container.children;
  if (logEntries.length > maxLogEntries) {
    container.removeChild(logEntries[0]);
  }
}

// addLogEntry函数已移除，直接使用addSystemLog

// ===================== 托盘配置管理 =====================

// 获取配置
async function getTrayConfig() {
  try {
    // @ts-ignore
    const config = await window.__TAURI__.core.invoke('get_config');
    return config;
  } catch (error) {
    console.error('获取配置失败:', error);
    return { auto_start: false, silent_start: false };
  }
}

// 设置自启动（暂时未使用）
// async function setAutoStart(enabled: boolean) {
//   try {
//     // @ts-ignore
//     await window.__TAURI__.core.invoke('set_auto_start', { enabled });
//     // @ts-ignore
//     await window.__TAURI__.core.invoke('save_config');
//     addSystemLog({
//       timestamp: getCurrentTimestamp(),
//       type: 'info',
//       message: `✅ 开机自启已${enabled ? '启用' : '禁用'}`
//     });
//   } catch (error) {
//     addSystemLog({
//       timestamp: getCurrentTimestamp(),
//       type: 'error',
//       message: `❌ 设置开机自启失败: ${error}`
//     });
//   }
// }

// 设置静默启动（暂时未使用）
// async function setSilentStart(enabled: boolean) {
//   try {
//     // @ts-ignore
//     await window.__TAURI__.core.invoke('set_silent_start', { enabled });
//     // @ts-ignore
//     await window.__TAURI__.core.invoke('save_config');
//     addSystemLog({
//     timestamp: getCurrentTimestamp(),
//     type: 'info',
//       message: `✅ 静默启动已${enabled ? '启用' : '禁用'}`
//     });
//   } catch (error) {
//     addSystemLog({
//       timestamp: getCurrentTimestamp(),
//       type: 'error',
//       message: `❌ 设置静默启动失败: ${error}`
//     });
//   }
// }

// 初始化托盘配置
async function initTrayConfig() {
  try {
    const config = await getTrayConfig();
    addSystemLog({
      timestamp: getCurrentTimestamp(),
      type: 'info',
      message: `📋 当前配置: 开机自启${config.auto_start ? '已启用' : '已禁用'}, 静默启动${config.silent_start ? '已启用' : '已禁用'}`
    });
  } catch (error) {
    console.error('初始化托盘配置失败:', error);
  }
}
