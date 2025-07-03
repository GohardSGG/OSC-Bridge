import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
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

// 设置窗口 DOM 元素
let settingsModal: HTMLElement;
let settingsBtn: HTMLButtonElement;
let closeSettingsBtn: HTMLButtonElement;
let wsUrlInput: HTMLInputElement;
let listenPortsContainer: HTMLElement;
let addListenPortBtn: HTMLButtonElement;
let forwardTargetsContainer: HTMLElement;
let addForwardTargetBtn: HTMLButtonElement;
let saveSettingsBtn: HTMLButtonElement;

// App-wide config object
const config = {
  listenPorts: [] as string[],
  forwardTargets: [] as string[]
};

// ===================== 初始化 =====================
window.addEventListener('DOMContentLoaded', async () => {
  console.log('OSC Bridge 控制面板正在初始化...');
  
  initializeElements();
  await loadConfigFromServer(); // 等待配置加载完成
  setupEventListeners();
  connectWebSocket();
  console.log('✅ 初始化完成。');
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

  // 获取设置窗口元素
  settingsModal = document.getElementById('settings-modal') as HTMLElement;
  settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;
  closeSettingsBtn = document.getElementById('close-settings-btn') as HTMLButtonElement;
  wsUrlInput = document.getElementById('ws-url-input') as HTMLInputElement;
  listenPortsContainer = document.getElementById('listen-ports-container') as HTMLElement;
  addListenPortBtn = document.getElementById('add-listen-port-btn') as HTMLButtonElement;
  forwardTargetsContainer = document.getElementById('forward-targets-container') as HTMLElement;
  addForwardTargetBtn = document.getElementById('add-forward-target-btn') as HTMLButtonElement;
  saveSettingsBtn = document.getElementById('save-settings-btn') as HTMLButtonElement;

  addSystemLog({
    timestamp: '[启动]',
    type: 'info',
    message: '🚀 OSC Bridge 控制面板已启动'
  });
  
  // 初始化托盘配置
  initTrayConfig();
}

async function loadConfigFromServer() {
  console.log('🔄 开始从服务器加载配置...');
  try {
    const response = await fetch('http://localhost:9122/config');
    console.log('📡 从服务器收到响应:', response);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const serverConfig = await response.json();
    console.log('📄 解析后的服务器配置数据:', serverConfig);
    
    config.listenPorts = serverConfig.ListenPorts || [];
    config.forwardTargets = serverConfig.TargetPorts || [];
    
    addSystemLog({
      timestamp: getCurrentTimestamp(),
      type: 'info',
      message: `✅ 本地端口配置加载成功`
    });
    addSystemLog({
      timestamp: getCurrentTimestamp(),
      type: 'info',
      message: `🔧 本地端口配置优先，跳过默认端口配置`
    });
    
  } catch (error) {
    addSystemLog({
      timestamp: getCurrentTimestamp(),
      type: 'error',
      message: `❌ 加载本地端口配置失败: ${error}. 将使用默认空配置.`
    });
  }
  // 无论成功与否，都更新顶部信息栏
  updateHeaderInfo();
}

function updateHeaderInfo() {
    const listenPortsDisplay = document.getElementById('listen-ports-display');
    const targetPortsDisplay = document.getElementById('target-ports-display');

    if(listenPortsDisplay) {
        listenPortsDisplay.textContent = formatPortsDisplay(config.listenPorts);
    }
    if(targetPortsDisplay) {
        targetPortsDisplay.textContent = formatPortsDisplay(config.forwardTargets);
    }
}

function formatPortsDisplay(ports: string[]) {
    if (!ports || ports.length === 0) {
        return '无';
    }
    const ipGroups: { [key: string]: string[] } = {};
    ports.forEach(port => {
        const parts = port.split(':');
        const [ip, portNum] = parts.length > 1 ? parts : ['127.0.0.1', parts[0]];
        if (!ipGroups[ip]) {
            ipGroups[ip] = [];
        }
        ipGroups[ip].push(portNum);
    });

    return Object.entries(ipGroups).map(([ip, portList]) => {
        return portList.length > 1 ? `${ip}:${portList.join('/')}` : `${ip}:${portList[0]}`;
    }).join(' || ');
}

function setupEventListeners() {
  console.log('⚙️ 开始设置事件监听器...');
  // OSC 发送表单
  const oscForm = document.getElementById('osc-form') as HTMLFormElement;
  oscForm.addEventListener('submit', handleOSCSend);
  console.log('  -> OSC 发送表单 "submit" 事件已监听');

  // 清除日志按钮
  const clearSentLogBtn = document.getElementById('clear-sent-log') as HTMLButtonElement;
  const clearReceivedLogBtn = document.getElementById('clear-received-log') as HTMLButtonElement;
  const clearSystemLogBtn = document.getElementById('clear-system-log') as HTMLButtonElement;
  clearSentLogBtn.addEventListener('click', () => clearLog('sent'));
  clearReceivedLogBtn.addEventListener('click', () => clearLog('received'));
  clearSystemLogBtn.addEventListener('click', () => clearLog('system'));
  console.log('  -> 清除日志按钮 "click" 事件已监听');

  // 自动滚动复选框
  autoScrollCheckbox.addEventListener('change', (e) => {
    isAutoScroll = (e.target as HTMLInputElement).checked;
    console.log(`  -> 自动滚动状态变更为: ${isAutoScroll}`);
  });
  console.log('  -> 自动滚动复选框 "change" 事件已监听');

  // 窗口关闭按钮
  const closeBtn = document.getElementById('close-btn') as HTMLButtonElement;
  console.log('关闭按钮元素:', closeBtn); // 调试信息
  
  if (closeBtn) {
    console.log('找到关闭按钮，正在添加事件监听器'); // 调试信息
    closeBtn.addEventListener('click', async () => {
      console.log('关闭按钮被点击了！'); // 调试信息
      try {
        const window = WebviewWindow.getCurrent();
        if (window) {
          await window.hide();
          console.log('窗口已隐藏');
        }
      } catch (error) {
        console.error('隐藏窗口失败:', error);
      }
    });
    console.log('关闭按钮事件监听器已添加'); // 调试信息
  } else {
    console.error('未找到关闭按钮元素！'); // 调试信息
  }

  // --- 设置窗口事件监听器 ---
  settingsBtn.addEventListener('click', () => {
    console.group('🔧 设置窗口操作');
    console.log('打开设置窗口');
    populateSettings();
    settingsModal.style.display = 'flex';
  });

  closeSettingsBtn.addEventListener('click', () => {
    settingsModal.style.display = 'none';
    console.log('关闭设置窗口');
    console.groupEnd();
  });

  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      settingsModal.style.display = 'none';
      console.log('通过点击背景关闭设置窗口');
      console.groupEnd();
    }
  });

  addListenPortBtn.addEventListener('click', () => {
    console.log('添加新的监听端口');
    const newItem = createSettingItem('127.0.0.1:新端口');
    listenPortsContainer.appendChild(newItem);
  });

  addForwardTargetBtn.addEventListener('click', () => {
    console.log('添加新的转发目标');
    const newItem = createSettingItem('127.0.0.1:新端口');
    forwardTargetsContainer.appendChild(newItem);
  });
  
  saveSettingsBtn.addEventListener('click', async () => {
    console.log('请求保存设置...');
    await saveConfigToServer();
    settingsModal.style.display = 'none';
    console.log('设置窗口已关闭');
    console.groupEnd();
  });

  // 禁用全局右键菜单
  window.addEventListener('contextmenu', e => e.preventDefault());
  console.log('  -> 全局右键菜单已禁用');

  console.log('✅ 所有事件监听器设置完成。');
}

// ===================== WebSocket 连接管理 =====================
function connectWebSocket() {
  addSystemLog({
    timestamp: getCurrentTimestamp(),
    type: 'info',
    message: '🔄 正在连接到 OSC Bridge 服务 (ws://localhost:9122)...'
  });

  websocket = new WebSocket('ws://localhost:9122');
  websocket.binaryType = 'arraybuffer';

  websocket.onopen = () => {
    updateConnectionStatus(true);
    addSystemLog({
      timestamp: getCurrentTimestamp(),
      type: 'info',
      message: '✅ WebSocket 连接已建立 (端口 9122)'
    });
  };

  websocket.onmessage = (event) => {
    console.groupCollapsed(`📥 收到 WebSocket 消息 (时间: ${getCurrentTimestamp()})`);
    console.log('原始事件:', event);
    // 后端只会发来字符串（JSON）
    if (typeof event.data === 'string') {
        console.log('消息内容 (字符串):', event.data);
        try {
            const payload = JSON.parse(event.data);
            console.log('解析后的 Payload:', payload);

            // 唯一的日志分发中心
            switch (payload.type) {
                case 'OscSent':
                case 'OscReceived': {
                    console.log(`  -> 类型匹配: ${payload.type}, 正在处理...`);
                    const data = payload.data;
                    
                    const values = data.args.map((arg: any) => arg.value).join(', ');
                    const types = data.args.map((arg: any) => arg.type).join(', ');

                    const message = `[${data.source_id}] -> 转发OSC到 ${data.sent_count}/${data.total_count} 个${data.destination_type} | 地址: ${data.addr} | 值: ${values} | 类型: ${types}`;
                    
                    const direction = (payload.type === 'OscSent') ? '→' : '←';
                    addOSCLog({ timestamp: getCurrentTimestamp(), type: payload.type === 'OscSent' ? 'sent' : 'received', direction, message });
                    break;
                }
                case 'ClientConnected': {
                    console.log(`  -> 类型匹配: ClientConnected, 正在处理...`);
                    const data = payload.data;
                    const client_type_str = data.client_type === "Frontend" ? "Browser" : data.client_type;
                    const message = `🔌 客户端 ${data.client_id} 已连接 (${client_type_str} - ${data.remote_addr})`;
                    addSystemLog({ timestamp: getCurrentTimestamp(), type: 'info', message });
                    break;
                }
                case 'ClientDisconnected': {
                    console.log(`  -> 类型匹配: ClientDisconnected, 正在处理...`);
                    const data = payload.data;
                    const message = `🔌 客户端 ${data.client_id} 已断开`;
                    addSystemLog({ timestamp: getCurrentTimestamp(), type: 'info', message });
                    break;
                }
                case 'System': {
                    console.log(`  -> 类型匹配: System, 正在处理...`);
                    const message = payload.data;
                    addSystemLog({ timestamp: getCurrentTimestamp(), type: 'info', message });
                    break;
                }
                default: {
                    // 对于任何未知的类型，我们只在控制台打印，不显示在UI上
                    console.log(`  -> 未知消息类型: ${payload.type}, 已在控制台记录。`, payload);
                }
            }
        } catch (e) {
            // 对于无法解析的JSON或非JSON字符串，我们也只在控制台打印
            console.error("  -> 消息解析失败或格式无效。", e);
        }
    } else if (event.data instanceof ArrayBuffer) {
        // 二进制消息现在由后端日志覆盖，前端不再需要解析来显示
        // 可以根据需要添加其他二进制处理逻辑
        console.log("收到二进制数据，出于日志记录目的忽略。", event.data);
    }
    console.groupEnd();
  };

  websocket.onclose = () => {
    updateConnectionStatus(false);
    addSystemLog({
      timestamp: getCurrentTimestamp(),
      type: 'warning',
      message: '⚠️ WebSocket 连接已断开，15秒后尝试重连...'
    });
    
    // 15秒后自动重连
    setTimeout(() => {
      if (!websocket || websocket.readyState === WebSocket.CLOSED) {
        connectWebSocket();
      }
    }, 15000);
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
/* 
  以下函数 handleLogMessage 和 handleIncomingOSCMessage
  的功能已被新的 websocket.onmessage 处理程序完全取代，
  因此可以安全地删除。
*/
// function handleLogMessage(logMessage: string) { ... }
// function handleIncomingOSCMessage(data: any) { ... }

function handleOSCSend(event: Event) {
  event.preventDefault();
  
  const address = oscAddressInput.value.trim();
  const argsText = oscArgsInput.value.trim();
  
  console.group('📤 尝试从UI发送OSC消息');
  console.log(`  -> 地址: ${address}`);
  console.log(`  -> 参数字符串: "${argsText}"`);
  
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
    
  } catch (error) {
    addSystemLog({
      timestamp: getCurrentTimestamp(),
      type: 'error',
      message: `❌ 发送失败: ${error}`
    });
  }
  console.groupEnd();
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
  if (isAutoScroll) {
    systemLogContainer.scrollTop = systemLogContainer.scrollHeight;
  }
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

// 创建日志元素 (所有美化逻辑的唯一入口)
function createLogElement(entry: LogEntry): HTMLElement {
  const logElement = document.createElement('div');
  logElement.className = `log-entry ${entry.type}`;

  const timestampElement = document.createElement('span');
  timestampElement.className = 'timestamp';
  timestampElement.textContent = `[${entry.timestamp}]`;
  logElement.appendChild(timestampElement);

  const messageElement = document.createElement('span');
  messageElement.className = 'message';

  const messageContent = document.createElement('span');
  // 直接将完整的消息传给颜色化函数
  messageContent.innerHTML = colorizeOSCMessage(entry.message);
  messageElement.appendChild(messageContent);
  logElement.appendChild(messageElement);

  return logElement;
}

// 关键还原：完全恢复到最原始、最有效的版本
function colorizeOSCMessage(message: string): string {
  let colorized = message;

  // 规则顺序很重要
  colorized = colorized.replace(/(地址: )([^\s|]+)/g, '$1<span class="osc-address">$2</span>');
  colorized = colorized.replace(/(值: )([^|]+)/g, '$1<span class="osc-value">$2</span>');
  colorized = colorized.replace(/(类型: )([^|]+)/g, '$1<span class="osc-type">$2</span>');
  colorized = colorized.replace(/(\[WS\])/g, '<span class="osc-client-id">$1</span>');
  colorized = colorized.replace(/(\[WS #\d+\])/g, '<span class="osc-client-id">$1</span>'); // 兼容旧格式
  colorized = colorized.replace(/(\[\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+\])/g, '<span class="osc-source">$1</span>');
  colorized = colorized.replace(/(\d+\/\d+)(?= 个(?:Target|WS))/g, '<span class="osc-count">$1</span>'); // 兼容旧格式
  colorized = colorized.replace(/(包 #\d+:)/g, '<span class="osc-type">$1</span>'); // 兼容旧格式

  return colorized;
}

// 限制日志条目数量
function limitLogEntries(container: HTMLElement) {
  const maxLogEntries = 500;
  const logEntries = container.children;
  if (logEntries.length > maxLogEntries) {
    container.removeChild(logEntries[0]);
  }
}

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

// ===================== 设置窗口功能 =====================

function populateSettings() {
  console.log('  -> 正在填充设置数据:', config);
  // 清空现有列表
  listenPortsContainer.innerHTML = '';
  forwardTargetsContainer.innerHTML = '';

  // 填充WebSocket URL (暂时只读)
  // wsUrlInput.value = 'ws://localhost:9122'; // 暂时硬编码

  // 填充监听端口
  config.listenPorts.forEach(port => {
    const item = createSettingItem(port);
    listenPortsContainer.appendChild(item);
  });

  // 填充转发目标
  config.forwardTargets.forEach(target => {
    const item = createSettingItem(target);
    forwardTargetsContainer.appendChild(item);
  });
}

function createSettingItem(value: string): HTMLElement {
  const item = document.createElement('div');
  item.className = 'settings-item';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'settings-input';
  input.value = value;

  const removeBtn = document.createElement('button');
  removeBtn.className = 'clear-icon-btn';
  removeBtn.title = '删除';
  removeBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      <line x1="10" y1="11" x2="10" y2="17"></line>
      <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>
  `;
  removeBtn.addEventListener('click', () => {
    item.remove(); // 直接从DOM中移除
  });

  item.appendChild(input);
  item.appendChild(removeBtn);
  return item;
}

async function saveConfigToServer() {
  // 从DOM中读取当前的端口设置
  const listenPorts = Array.from(listenPortsContainer.children).map(item => (item.querySelector('.settings-input') as HTMLInputElement).value);
  const forwardTargets = Array.from(forwardTargetsContainer.children).map(item => (item.querySelector('.settings-input') as HTMLInputElement).value);

  const newConfig = {
    ListenPorts: listenPorts,
    TargetPorts: forwardTargets,
    WS: [wsUrlInput.value] // 读取WS地址
  };
  
  console.log('  -> 准备发送到服务器的新配置:', newConfig);
  try {
    const response = await fetch('http://localhost:9122/save-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newConfig)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    // 更新本地的全局config对象
    config.listenPorts = result.ListenPorts;
    config.forwardTargets = result.TargetPorts;
    
    addSystemLog({
      timestamp: getCurrentTimestamp(),
      type: 'info',
      message: '✅ 配置保存成功，服务已自动重载'
    });
    
    updateHeaderInfo(); // 更新顶部的显示

  } catch (error) {
    addSystemLog({
      timestamp: getCurrentTimestamp(),
      type: 'error',
      message: `❌ 保存配置失败: ${error}`
    });
  }
}
