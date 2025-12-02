import { writable, derived } from 'svelte/store';

// --- Type Definitions ---
export type SystemLogEntry = {
  id: string;
  time: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'connect';
  key?: string; // Translation key
  values?: object; // Values for interpolation
  msg?: string; // Raw message (for non-i18n logs)
};

// --- UI State Stores ---
export const isDarkMode = writable(false);
export const isSettingsOpen = writable(false);
export const isAutoScroll = writable(true);
export const isAlwaysOnTop = writable(false);

// --- Log Stores ---
export const systemLogs = writable<SystemLogEntry[]>([]);
export const oscSentLogs = writable<any[]>([]);
export const oscRecvLogs = writable<any[]>([]);


// --- Search / Filter State ---
export const sentSearchTerm = writable("");
export const recvSearchTerm = writable("");

// --- Tray / App Config State ---
export const autoStartEnabled = writable(false);
export const silentStartEnabled = writable(false);

// --- Derived Stores for Filtered Logs ---
export const filteredSentLogs = derived(
  [oscSentLogs, sentSearchTerm],
  ([$oscSentLogs, $sentSearchTerm]) => {
    if (!$sentSearchTerm) {
      return $oscSentLogs;
    }
    const lowerCaseTerm = $sentSearchTerm.toLowerCase();
    return $oscSentLogs.filter(log => 
      log.path.toLowerCase().includes(lowerCaseTerm) ||
      log.val.toLowerCase().includes(lowerCaseTerm) ||
      (log.target && log.target.toLowerCase().includes(lowerCaseTerm))
    );
  }
);

export const filteredRecvLogs = derived(
  [oscRecvLogs, recvSearchTerm],
  ([$oscRecvLogs, $recvSearchTerm]) => {
    if (!$recvSearchTerm) {
      return $oscRecvLogs;
    }
    const lowerCaseTerm = $recvSearchTerm.toLowerCase();
    return $oscRecvLogs.filter(log => 
      log.path.toLowerCase().includes(lowerCaseTerm) ||
      log.val.toLowerCase().includes(lowerCaseTerm) ||
      (log.source && log.source.toLowerCase().includes(lowerCaseTerm))
    );
  }
);


// --- Injector State ---
export const injectorAddress = writable("/Test");
export const injectorArgs = writable("1");

// --- Settings Modal State ---
export const settingsWsUrl = writable("ws://localhost:9122");
export const settingsListenPorts = writable(["127.0.0.1:7879", "127.0.0.1:9222", "127.0.0.1:7444"]);
export const settingsForwardTargets = writable(["192.168.137.199:7879"]);
