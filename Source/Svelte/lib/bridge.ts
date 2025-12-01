import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import OSC from 'osc-js';
import { 
  systemLogs, 
  oscSentLogs, 
  oscRecvLogs,
  settingsListenPorts,
  settingsForwardTargets,
  settingsWsUrl,
  autoStartEnabled,
  silentStartEnabled
} from './stores/stores';

let websocket: WebSocket | null = null;
let logIdCounter = 0;

// --- Helper Functions ---
function getUniqueLogId(): string {
  return `${Date.now()}-${logIdCounter++}`;
}

function getCurrentTimestamp(): string {
  const now = new Date();
  return now.toTimeString().split(' ')[0]; // HH:MM:SS format
}

function addSystemLog(type: 'info' | 'warning' | 'error' | 'success' | 'connect', msg: string) {
    systemLogs.update(logs => {
        const newLog = { id: getUniqueLogId(), time: getCurrentTimestamp(), type, msg };
        const newLogs = [...logs, newLog];
        if (newLogs.length > 500) {
            return newLogs.slice(newLogs.length - 500);
        }
        return newLogs;
    });
}


// --- WebSocket Logic ---
export function initializeBridge() {
  addSystemLog('info', '🔄 正在连接到 OSC Bridge 日志服务...');
  
  // Clear mock data on initialization attempt
  systemLogs.set([]);
  oscSentLogs.set([]);
  oscRecvLogs.set([]);

  websocket = new WebSocket('ws://localhost:9122/logs');

  websocket.onopen = () => {
    addSystemLog('success', '✅ WebSocket 连接已建立。');
  };

  websocket.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      handleBackendMessage(payload);
    } catch (e) {
      addSystemLog('error', `❌ 解析后端消息失败: ${e}`);
    }
  };

  websocket.onclose = () => {
    addSystemLog('warning', '⚠️ WebSocket 连接已断开，5秒后尝试重连...');
    setTimeout(initializeBridge, 5000);
  };

  websocket.onerror = (error) => {
    addSystemLog('error', `❌ WebSocket 连接错误: ${error}`);
  };
}

function handleBackendMessage(payload: any) {
  const { type, data } = payload;
  const timestamp = getCurrentTimestamp();
  const id = getUniqueLogId();

  switch (type) {
    case 'OscSent':
      oscSentLogs.update(logs => {
          const newLog = {
            id,
            time: timestamp,
            path: data.addr,
            val: data.args.map((a: any) => a.value).join(', '),
            type: data.args.map((a: any) => a.type).join(', '),
            target: data.source_id,
            ...data
          };
          const newLogs = [...logs, newLog];
          if (newLogs.length > 500) {
              return newLogs.slice(newLogs.length - 500);
          }
          return newLogs;
      });
      break;
    case 'OscReceived':
      oscRecvLogs.update(logs => {
          const newLog = {
            id,
            time: timestamp,
            path: data.addr,
            val: data.args.map((a: any) => a.value).join(', '),
            type: data.args.map((a: any) => a.type).join(', '),
            source: data.source_id,
            ...data
          };
          const newLogs = [...logs, newLog];
          if (newLogs.length > 500) {
              return newLogs.slice(newLogs.length - 500);
          }
          return newLogs;
      });
      break;
    case 'ClientConnected':
      addSystemLog('connect', `🔌 客户端 #${data.client_id} 已连接 (${data.client_type} - ${data.remote_addr})`);
      break;
    case 'ClientDisconnected':
      addSystemLog('info', `🔌 客户端 #${data.client_id} 已断开。`);
      break;
    case 'System':
      addSystemLog('info', data);
      break;
    default:
      addSystemLog('info', `后端 (未知类型 '${type}'): ${JSON.stringify(data)}`);
      break;
  }
}

// --- Argument Parsing ---
function parseOSCArguments(argsText: string): any[] {
  if (!argsText) return [];
  
  return argsText.split(',').map(arg => {
    const trimmed = arg.trim();
    
    // Attempt to parse as a number
    if (!isNaN(Number(trimmed)) && trimmed !== '') {
      return Number(trimmed);
    }
    
    // Attempt to parse as a boolean
    if (trimmed.toLowerCase() === 'true') return true;
    if (trimmed.toLowerCase() === 'false') return false;
    
    // Default to string
    return trimmed;
  });
}


// --- UI Actions ---
export function sendOsc(address: string, argsText: string) {
  if (!websocket || websocket.readyState !== WebSocket.OPEN) {
    addSystemLog('error', '❌ WebSocket 未连接，无法发送消息。');
    return;
  }
  
  if (!address) {
    addSystemLog('error', '❌ OSC 地址不能为空。');
    return;
  }
  
  try {
    const args = parseOSCArguments(argsText);
    const message = new OSC.Message(address, ...args);
    const binaryData = message.pack();
    
    websocket.send(binaryData);
  } catch (error) {
    addSystemLog('error', `❌ 解析或发送 OSC 消息失败: ${error}`);
  }
}

export async function hideWindow() {
  await getCurrentWindow().hide();
}

export async function saveConfiguration() {
    let listenPorts: string[] = [];
    let forwardTargets: string[] = [];
    let wsUrl: string = '';

    const unsubscribe = [
        settingsListenPorts.subscribe(value => { listenPorts = value }),
        settingsForwardTargets.subscribe(value => { forwardTargets = value }),
        settingsWsUrl.subscribe(value => { wsUrl = value })
    ];

    const newConfig = {
        ListenPorts: listenPorts,
        TargetPorts: forwardTargets,
        WS: [wsUrl]
    };
    
    try {
        await invoke('save_bridge_config', { config: newConfig });
        addSystemLog('success', '✅ 配置保存成功，服务正在重启...');
    } catch (error) {
        addSystemLog('error', `❌ 保存配置失败: ${error}`);
    }

    unsubscribe.forEach(unsub => unsub());
}

export async function loadInitialConfig() {
    try {
        const serverConfig = await invoke<{ListenPorts: string[], TargetPorts: string[], WS: string[]}>('get_bridge_config');
        settingsListenPorts.set(serverConfig.ListenPorts || []);
        settingsForwardTargets.set(serverConfig.TargetPorts || []);
        settingsWsUrl.set((serverConfig.WS && serverConfig.WS[0]) || 'ws://localhost:9122');
        addSystemLog('info', '🚀 已从后端加载初始配置。');

        // Also load tray config on startup
        await loadTrayConfig();

    } catch (error) {
        addSystemLog('error', `❌ 加载初始配置失败: ${error}`);
    }
}

export async function loadTrayConfig() {
    try {
        const trayConfig = await invoke<{auto_start: boolean, silent_start: boolean}>('get_config');
        autoStartEnabled.set(trayConfig.auto_start);
        silentStartEnabled.set(trayConfig.silent_start);
        addSystemLog('info', `📋 托盘配置: 开机自启 ${trayConfig.auto_start ? '已启用' : '已禁用'}, 静默启动 ${trayConfig.silent_start ? '已启用' : '已禁用'}`);
    } catch (error) {
        addSystemLog('error', `❌ 加载托盘配置失败: ${error}`);
    }
}
