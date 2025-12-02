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

function addSystemLog(type: 'info' | 'warning' | 'error' | 'success' | 'connect', key: string, values?: object) {
    systemLogs.update(logs => {
        const newLog = { id: getUniqueLogId(), time: getCurrentTimestamp(), type, key, values };
        const newLogs = [...logs, newLog];
        if (newLogs.length > 500) {
            return newLogs.slice(newLogs.length - 500);
        }
        return newLogs;
    });
}


// --- WebSocket Logic ---
export function initializeBridge() {
  addSystemLog('info', 'logs.connecting');
  
  // Clear mock data on initialization attempt
  systemLogs.set([]);
  oscSentLogs.set([]);
  oscRecvLogs.set([]);

  websocket = new WebSocket('ws://localhost:9122/logs');

  websocket.onopen = () => {
    addSystemLog('success', 'logs.connected');
  };

  websocket.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      handleBackendMessage(payload);
    } catch (e) {
      addSystemLog('error', 'logs.parse_error', { error: e });
    }
  };

  websocket.onclose = () => {
    addSystemLog('warning', 'logs.disconnected');
    setTimeout(initializeBridge, 5000);
  };

  websocket.onerror = (error) => {
    addSystemLog('error', 'logs.error', { error });
  };
}

function handleBackendMessage(payload: any) {
  const { type, data } = payload;
  
  switch (type) {
    case 'OscSent':
      // This is handled in TrafficMonitor, not system log
      break;
    case 'OscReceived':
      // This is handled in TrafficMonitor, not system log
      break;
    case 'ClientConnected':
      addSystemLog('connect', 'logs.client_connected', { clientId: data.client_id, clientType: data.client_type, remoteAddr: data.remote_addr });
      break;
    case 'ClientDisconnected':
      addSystemLog('info', 'logs.client_disconnected', { clientId: data.client_id });
      break;
    case 'System':
      // Assuming system messages from backend are simple strings for now
      systemLogs.update(logs => [...logs, { id: getUniqueLogId(), time: getCurrentTimestamp(), type: 'info', msg: data }]);
      break;
    default:
      addSystemLog('info', 'logs.unknown_backend_msg', { type, data: JSON.stringify(data) });
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
    addSystemLog('error', 'logs.websocket_not_connected');
    return;
  }
  
  if (!address) {
    addSystemLog('error', 'logs.osc_address_empty');
    return;
  }
  
  try {
    const args = parseOSCArguments(argsText);
    const message = new OSC.Message(address, ...args);
    const binaryData = message.pack();
    
    websocket.send(binaryData);
  } catch (error) {
    addSystemLog('error', 'logs.osc_send_error', { error });
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
        addSystemLog('success', 'logs.config_saved');
    } catch (error) {
        addSystemLog('error', 'logs.config_save_error', { error });
    }

    unsubscribe.forEach(unsub => unsub());
}

export async function loadInitialConfig() {
    try {
        const serverConfig = await invoke<{ListenPorts: string[], TargetPorts: string[], WS: string[]}>('get_bridge_config');
        settingsListenPorts.set(serverConfig.ListenPorts || []);
        settingsForwardTargets.set(serverConfig.TargetPorts || []);
        settingsWsUrl.set((serverConfig.WS && serverConfig.WS[0]) || 'ws://localhost:9122');
        addSystemLog('info', 'logs.config_loaded');

        // Also load tray config on startup
        await loadTrayConfig();

    } catch (error) {
        addSystemLog('error', 'logs.config_load_error', { error });
    }
}

export async function loadTrayConfig() {
    try {
        const trayConfig = await invoke<{auto_start: boolean, silent_start: boolean}>('get_config');
        autoStartEnabled.set(trayConfig.auto_start);
        silentStartEnabled.set(trayConfig.silent_start);
        addSystemLog('info', 'logs.tray_config_loaded', { autoStart: trayConfig.auto_start ? 'enabled' : 'disabled', silentStart: trayConfig.silent_start ? 'enabled' : 'disabled' });
    } catch (error) {
        addSystemLog('error', 'logs.tray_config_load_error', { error });
    }
}
