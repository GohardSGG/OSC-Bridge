import { writable, derived } from 'svelte/store';

// --- UI State Stores ---
export const isDarkMode = writable(false);
export const isSettingsOpen = writable(false);
export const isAutoScroll = writable(true);

// --- Mock Data Stores ---
// System Logs
export const systemLogs = writable([
  { time: "13:31:31", type: "info", msg: "Configuration loaded." },
  { time: "13:31:31", type: "success", msg: "WebSocket :9122 OK." },
  { time: "13:32:47", type: "connect", msg: "Client #2 Connected." },
  { time: "13:32:50", type: "connect", msg: "Client #3 Connected." },
  { time: "13:33:12", type: "info", msg: "OSC Bridge Active." },
  { time: "13:35:00", type: "warning", msg: "High latency detected." },
]);

// OSC Sent Logs
export const oscSentLogs = writable([
  { time: "14:34:13", target: "WS #2", path: "/Monitor/Master/Dim", val: "1.0000", type: "Float" },
  { time: "14:34:28", target: "WS #2", path: "/Monitor/Master/Dim", val: "0.0000", type: "Float" },
  { time: "14:34:34", target: "WS #2", path: "/Monitor/Master/Dim", val: "1.0000", type: "Float" },
  { time: "14:34:35", target: "WS #2", path: "/Monitor/Master/Dim", val: "0.0000", type: "Float" },
  { time: "14:35:10", target: "WS #2", path: "/Monitor/Volume", val: "0.7500", type: "Float" },
  { time: "14:35:12", target: "WS #2", path: "/Monitor/Volume", val: "0.7600", type: "Float" },
  { time: "14:35:15", target: "WS #2", path: "/Monitor/Volume", val: "0.8000", type: "Float" },
  { time: "14:36:00", target: "WS #3", path: "/Effect/Reverb/Size", val: "45", type: "Int" },
  { time: "14:36:01", target: "WS #3", path: "/Effect/Reverb/Size", val: "46", type: "Int" },
]);

// OSC Received Logs
export const oscRecvLogs = writable([
  { time: "14:34:15", source: "192.168.1.10", path: "/Remote/Fader/1", val: "0.55", type: "Float" },
  { time: "14:34:16", source: "192.168.1.10", path: "/Remote/Fader/1", val: "0.56", type: "Float" },
  { time: "14:34:17", source: "192.168.1.10", path: "/Remote/Fader/1", val: "0.60", type: "Float" },
  { time: "14:34:20", source: "iPad Control", path: "/Scene/Recall", val: "Scene_A", type: "String" },
  { time: "14:34:22", source: "iPad Control", path: "/Transport/Play", val: "1", type: "Int" },
  { time: "14:35:00", source: "Core Audio", path: "/Meter/L", val: "<Blob 256b>", type: "Blob" },
  { time: "14:35:00", source: "Core Audio", path: "/Meter/R", val: "<Blob 256b>", type: "Blob" },
  { time: "14:35:01", source: "Core Audio", path: "/Meter/L", val: "<Blob 256b>", type: "Blob" },
]);

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
