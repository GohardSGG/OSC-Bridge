import React, { useState, useEffect } from 'react';
import { 
  Send, Settings, X, Activity, Server, Radio, 
  Trash2, Search, ArrowUpRight, ArrowDownLeft, 
  Terminal, PlayCircle, PauseCircle, Plus, Check, Save,
  Sun, Moon
} from 'lucide-react';

// --- Mock Data ---
const SYSTEM_LOGS = [
  { time: "13:31:31", type: "info", msg: "Configuration loaded." },
  { time: "13:31:31", type: "success", msg: "WebSocket :9122 OK." },
  { time: "13:32:47", type: "connect", msg: "Client #2 Connected." },
  { time: "13:32:50", type: "connect", msg: "Client #3 Connected." },
  { time: "13:33:12", type: "info", msg: "OSC Bridge Active." },
  { time: "13:35:00", type: "warning", msg: "High latency detected." },
];

const OSC_SENT_LOGS = [
  { time: "14:34:13", target: "WS #2", path: "/Monitor/Master/Dim", val: "1.0000", type: "Float" },
  { time: "14:34:28", target: "WS #2", path: "/Monitor/Master/Dim", val: "0.0000", type: "Float" },
  { time: "14:34:34", target: "WS #2", path: "/Monitor/Master/Dim", val: "1.0000", type: "Float" },
  { time: "14:34:35", target: "WS #2", path: "/Monitor/Master/Dim", val: "0.0000", type: "Float" },
  { time: "14:35:10", target: "WS #2", path: "/Monitor/Volume", val: "0.7500", type: "Float" },
  { time: "14:35:12", target: "WS #2", path: "/Monitor/Volume", val: "0.7600", type: "Float" },
  { time: "14:35:15", target: "WS #2", path: "/Monitor/Volume", val: "0.8000", type: "Float" },
  { time: "14:36:00", target: "WS #3", path: "/Effect/Reverb/Size", val: "45", type: "Int" },
  { time: "14:36:01", target: "WS #3", path: "/Effect/Reverb/Size", val: "46", type: "Int" },
];

const OSC_RECV_LOGS = [
  { time: "14:34:15", source: "192.168.1.10", path: "/Remote/Fader/1", val: "0.55", type: "Float" },
  { time: "14:34:16", source: "192.168.1.10", path: "/Remote/Fader/1", val: "0.56", type: "Float" },
  { time: "14:34:17", source: "192.168.1.10", path: "/Remote/Fader/1", val: "0.60", type: "Float" },
  { time: "14:34:20", source: "iPad Control", path: "/Scene/Recall", val: "Scene_A", type: "String" },
  { time: "14:34:22", source: "iPad Control", path: "/Transport/Play", val: "1", type: "Int" },
  { time: "14:35:00", source: "Core Audio", path: "/Meter/L", val: "<Blob 256b>", type: "Blob" },
  { time: "14:35:00", source: "Core Audio", path: "/Meter/R", val: "<Blob 256b>", type: "Blob" },
  { time: "14:35:01", source: "Core Audio", path: "/Meter/L", val: "<Blob 256b>", type: "Blob" },
];

// --- Theme Config ---
// Centralized theme logic to easily manage Dark/Light switch
const useThemeClass = (isDark, lightClass, darkClass) => isDark ? darkClass : lightClass;

// --- Components ---

// 1. Brutalist Input Field
const TechInput = ({ label, value, onChange, placeholder, className = "", isDark }) => (
  <div className={`flex flex-col gap-1 w-full ${className}`}>
    {label && (
      <label className={`text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        {label}
      </label>
    )}
    <input 
      type="text" 
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`
        h-8 px-2 border-2 font-mono text-xs focus:outline-none transition-colors
        ${isDark 
          ? 'bg-[#09090b] border-slate-700 text-slate-200 focus:border-slate-500 placeholder:text-slate-700' 
          : 'bg-white border-slate-300 text-slate-800 focus:border-slate-800 placeholder:text-slate-300'}
      `}
    />
  </div>
);

// 2. Helper: Get Color Style for Data Types (Adaptive)
const getTypeStyles = (type, isDark) => {
  if (isDark) {
    // Dark Mode: More transparent backgrounds, brighter text
    switch(type) {
      case 'Float': return 'bg-teal-950/50 text-teal-400 border-teal-900'; 
      case 'Int': return 'bg-indigo-950/50 text-indigo-400 border-indigo-900';
      case 'String': return 'bg-amber-950/50 text-amber-400 border-amber-900';
      case 'Blob': return 'bg-rose-950/50 text-rose-400 border-rose-900';
      default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  } else {
    // Light Mode: Original
    switch(type) {
      case 'Float': return 'bg-teal-50 text-teal-700 border-teal-200'; 
      case 'Int': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'String': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Blob': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  }
};

// 3. Log Line Item
const LogLine = ({ log, direction = "TX", isDark }) => (
  <div className={`
    font-mono text-[10px] py-0.5 border-b flex items-center group cursor-default select-text transition-colors
    ${isDark 
      ? 'border-slate-800 hover:bg-white/5 text-slate-400' 
      : 'border-slate-100 hover:bg-yellow-50 text-slate-700'}
  `}>
    {/* Time */}
    <span className={`w-[52px] shrink-0 text-right font-medium mr-2 ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>[{log.time}]</span>
    
    {/* Source/Target Indicator (Block Style) */}
    <div className={`
      shrink-0 px-1.5 py-px text-[9px] font-bold border mr-2
      ${direction === 'TX' 
         ? (isDark ? 'bg-blue-950/40 text-blue-400 border-blue-900' : 'bg-blue-50 text-blue-700 border-blue-200')
         : (isDark ? 'bg-purple-950/40 text-purple-400 border-purple-900' : 'bg-purple-50 text-purple-700 border-purple-200')}
    `}>
       {direction === 'TX' ? log.target : log.source}
    </div>

    {/* Message Content */}
    <div className="flex items-center">
       <span className={`font-semibold ${isDark ? 'text-amber-500' : 'text-amber-700'}`}>{log.path}</span>
       <span className={`mx-1.5 ${isDark ? 'text-slate-700' : 'text-slate-300'}`}>·</span>
       <span className={`font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{log.val}</span>
    </div>
    
    {/* Spacer */}
    <div className="flex-1"></div>
    
    {/* Type Indicator */}
    <div className={`
       shrink-0 px-1.5 py-px text-[9px] font-bold border ml-2
       ${getTypeStyles(log.type, isDark)}
    `}>
       {log.type}
    </div>
  </div>
);

// 4. Section Divider
const SectionHeader = ({ label, icon: Icon, count, isDark }) => (
  <div className={`
    h-6 border-y flex items-center justify-between px-3 select-none
    ${isDark ? 'bg-[#1e1e22] border-slate-700' : 'bg-slate-50 border-slate-200'}
  `}>
     <div className={`flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        <Icon size={10} />
        <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
     </div>
     {count !== undefined && (
       <span className={`text-[9px] px-1 rounded font-mono ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>
         {count}
       </span>
     )}
  </div>
);

// 5. Settings Modal Component
const SettingsModal = ({ isOpen, onClose, isDark }) => {
  if (!isOpen) return null;

  const [wsUrl, setWsUrl] = useState("ws://localhost:9122");
  const [ports, setPorts] = useState(["127.0.0.1:7879", "127.0.0.1:9222", "127.0.0.1:7444"]);
  const [targets, setTargets] = useState(["192.168.137.199:7879"]);

  const removePort = (idx) => setPorts(ports.filter((_, i) => i !== idx));
  const removeTarget = (idx) => setTargets(targets.filter((_, i) => i !== idx));

  // Modal Theme Styles
  const modalBg = isDark ? 'bg-[#18181b] border-slate-600' : 'bg-white border-slate-800';
  const headerBg = isDark ? 'bg-slate-900 text-slate-200' : 'bg-slate-800 text-white';
  const contentBg = isDark ? 'bg-[#09090b]' : 'bg-[#f8fafc]';
  const sectionTitle = isDark ? 'text-slate-500' : 'text-slate-400';
  const divider = isDark ? 'bg-slate-800 border-slate-900' : 'bg-slate-200 border-white';
  const footerBg = isDark ? 'bg-[#18181b] border-slate-800 text-slate-600' : 'bg-slate-100 border-slate-200 text-slate-400';
  const addBtn = isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-800 border-slate-900 text-white hover:bg-slate-700';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
      <div className={`w-[480px] border-2 shadow-[16px_16px_0px_rgba(0,0,0,0.3)] flex flex-col animate-in fade-in zoom-in-95 duration-100 ${modalBg}`}>
        
        {/* Modal Header */}
        <div className={`h-10 flex items-center justify-between px-4 select-none ${headerBg}`}>
          <div className="flex items-center gap-2">
            <Settings size={14} />
            <span className="text-xs font-bold uppercase tracking-widest">System Config</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="hover:text-emerald-400 transition-colors"><Check size={16} strokeWidth={3} /></button>
            <div className={`w-px h-4 ${isDark ? 'bg-slate-700' : 'bg-slate-600'}`}></div>
            <button onClick={onClose} className="hover:text-rose-400 transition-colors"><X size={16} strokeWidth={3} /></button>
          </div>
        </div>

        {/* Modal Content */}
        <div className={`p-6 space-y-6 overflow-y-auto max-h-[600px] ${contentBg}`}>
          
          {/* Section: Connection */}
          <div>
             <h3 className={`text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-2 ${sectionTitle}`}>
                <Server size={12} /> WebSocket Host
             </h3>
             <TechInput value={wsUrl} onChange={(e) => setWsUrl(e.target.value)} isDark={isDark} />
          </div>

          <div className={`h-px border-b ${divider}`}></div>

          {/* Section: Listen Ports */}
          <div>
             <h3 className={`text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2 ${sectionTitle}`}>
                <Radio size={12} /> Listening Ports
             </h3>
             <div className="space-y-2">
                {ports.map((port, idx) => (
                   <div key={idx} className="flex gap-2">
                      <TechInput value={port} onChange={() => {}} className="flex-1" isDark={isDark} />
                      <button 
                        onClick={() => removePort(idx)}
                        className={`w-8 h-8 border-2 flex items-center justify-center transition-colors ${isDark ? 'bg-[#18181b] border-slate-700 text-slate-400 hover:text-rose-400' : 'bg-white border-slate-300 hover:text-rose-600'}`}
                      >
                         <Trash2 size={14} />
                      </button>
                   </div>
                ))}
                <button 
                   onClick={() => setPorts([...ports, ""])}
                   className={`w-full h-8 mt-2 border-2 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider active:translate-y-[1px] shadow-sm transition-all ${addBtn}`}
                >
                   <Plus size={12} strokeWidth={3} /> Add Port
                </button>
             </div>
          </div>

          <div className={`h-px border-b ${divider}`}></div>

          {/* Section: Forward Targets */}
          <div>
             <h3 className={`text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2 ${sectionTitle}`}>
                <Send size={12} /> Forwarding Targets
             </h3>
             <div className="space-y-2">
                {targets.map((target, idx) => (
                   <div key={idx} className="flex gap-2">
                      <TechInput value={target} onChange={() => {}} className="flex-1" isDark={isDark} />
                      <button 
                         onClick={() => removeTarget(idx)}
                         className={`w-8 h-8 border-2 flex items-center justify-center transition-colors ${isDark ? 'bg-[#18181b] border-slate-700 text-slate-400 hover:text-rose-400' : 'bg-white border-slate-300 hover:text-rose-600'}`}
                      >
                         <Trash2 size={14} />
                      </button>
                   </div>
                ))}
                 <button 
                   onClick={() => setTargets([...targets, ""])}
                   className={`w-full h-8 mt-2 border-2 border-dashed flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-all ${isDark ? 'bg-transparent border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300' : 'bg-white border-slate-300 text-slate-600 hover:border-slate-800'}`}
                >
                   <Plus size={12} /> Add Target
                </button>
             </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className={`h-6 border-t flex items-center px-4 justify-between text-[10px] font-mono ${footerBg}`}>
           <span>CFG_VER: 2.1.0</span>
           <span>STATUS: EDITED</span>
        </div>
      </div>
    </div>
  );
};


// --- Main App ---

const OscDebugger = () => {
  const [address, setAddress] = useState("/Test");
  const [args, setArgs] = useState("1");
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // --- Dark Mode State ---
  const [isDarkMode, setIsDarkMode] = useState(false);
  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // --- Dynamic Theme Classes ---
  // Main Container
  const bgMain = isDarkMode ? 'bg-[#09090b]' : 'bg-[#d4d4d8]';
  const chassisBg = isDarkMode ? 'bg-[#18181b]' : 'bg-[#f4f4f5]';
  const chassisBorder = isDarkMode ? 'border-slate-700' : 'border-slate-600';
  const shadow = isDarkMode ? 'shadow-[12px_12px_0px_rgba(0,0,0,0.5)]' : 'shadow-[12px_12px_0px_rgba(30,41,59,0.2)]';
  
  // Top Bar
  const topBarBg = isDarkMode ? 'bg-[#000000] border-slate-800' : 'bg-slate-800 border-slate-900';
  
  // Panels
  const leftPanelBg = isDarkMode ? 'bg-[#18181b] border-slate-800' : 'bg-slate-50 border-slate-300';
  const controlBoxBg = isDarkMode ? 'bg-[#1e1e22] border-slate-800' : 'bg-white border-slate-200';
  const sysLogBg = isDarkMode ? 'bg-[#111113]' : 'bg-[#fcfcfc]';
  const sysLogHeaderBg = isDarkMode ? 'bg-[#18181b] border-slate-800' : 'bg-slate-100 border-slate-200';
  
  // Right Panel
  const rightPanelHeaderBg = isDarkMode ? 'bg-[#1e1e22] border-slate-800' : 'bg-white border-slate-300';
  const searchInputBg = isDarkMode ? 'bg-[#09090b] border-slate-700 focus:bg-[#18181b] text-slate-300' : 'bg-slate-50 border-slate-200 focus:bg-white text-slate-800';
  const txBg = isDarkMode ? 'bg-[#111113]' : 'bg-white';
  const rxBg = isDarkMode ? 'bg-[#09090b]' : 'bg-[#fafafa]';
  const scrollBtnBg = isDarkMode ? (isAutoScroll ? 'bg-slate-700 text-white' : 'bg-slate-900 text-slate-500') : (isAutoScroll ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500');

  // Text Colors
  const textMain = isDarkMode ? 'text-slate-200' : 'text-slate-800';
  const textMuted = isDarkMode ? 'text-slate-500' : 'text-slate-400';
  const titleText = isDarkMode ? 'text-slate-300' : 'text-slate-800';

  return (
    <div className={`min-h-screen font-sans p-4 md:p-8 flex items-center justify-center transition-colors duration-300 ${bgMain}`}>
      
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} isDark={isDarkMode} />

      {/* Chassis - Reduced Height to 650px */}
      <div className={`w-full max-w-5xl h-[650px] border-2 flex flex-col overflow-hidden transition-colors duration-300 ${chassisBg} ${chassisBorder} ${shadow}`}>
        
        {/* --- Top Status Bar --- */}
        <div className={`h-8 flex items-center px-3 justify-between border-b-2 select-none shrink-0 ${topBarBg}`}>
          <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400">
            <div className="flex items-center gap-2 text-emerald-400">
              <div className="w-1.5 h-1.5 bg-emerald-500 animate-pulse"></div>
              <span className="font-bold tracking-wider">ONLINE</span>
            </div>
            <span className="opacity-30">|</span>
            <div className="flex items-center gap-1.5">
              <Server size={10} />
              <span>0.0.0.0:7879</span>
            </div>
            <span className="opacity-30">|</span>
            <div className="flex items-center gap-1.5">
              <Radio size={10} />
              <span>127.0.0.1:7878</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
             {/* Dark Mode Toggle */}
             <button 
                onClick={toggleTheme} 
                className={`hover:text-amber-400 transition-colors ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`}
                title="Toggle Night Vision"
             >
                {isDarkMode ? <Sun size={12} /> : <Moon size={12} />}
             </button>

             <div className="w-px h-3 bg-slate-700"></div>

             <Settings 
                size={12} 
                className="text-slate-400 hover:text-white cursor-pointer transition-colors" 
                onClick={() => setIsSettingsOpen(true)}
             />
             <X size={12} className="text-slate-400 hover:text-rose-500 cursor-pointer" />
          </div>
        </div>

        {/* --- Main Workspace --- */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* --- LEFT COLUMN --- */}
          <div className={`w-64 border-r-2 flex flex-col shrink-0 ${leftPanelBg}`}>
            
            {/* Control Box */}
            <div className={`p-3 border-b-2 ${controlBoxBg}`}>
              <div className="mb-3">
                 <h2 className={`text-xs font-black flex items-center gap-2 uppercase tracking-wide ${titleText}`}>
                   <Terminal size={14} />
                   Injector
                 </h2>
              </div>
              <div className="space-y-2">
                <TechInput 
                  label="Address" 
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="/address"
                  isDark={isDarkMode}
                />
                <TechInput 
                  label="Args" 
                  value={args} 
                  onChange={(e) => setArgs(e.target.value)}
                  placeholder="Val..."
                  isDark={isDarkMode}
                />
                
                <button className={`h-8 w-full border-2 font-bold uppercase tracking-widest active:translate-y-[1px] transition-all flex items-center justify-center gap-2 mt-1 shadow-[2px_2px_0px_rgba(0,0,0,0.1)] text-[10px] ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600' : 'bg-slate-800 border-slate-900 text-white hover:bg-slate-700'}`}>
                  <Send size={10} />
                  SEND
                </button>
              </div>
            </div>

            {/* System Log */}
            <div className={`flex-1 flex flex-col min-h-0 ${sysLogBg}`}>
               <div className={`h-6 border-b px-3 flex items-center justify-between shrink-0 ${sysLogHeaderBg}`}>
                  <span className={`text-[9px] font-bold uppercase flex items-center gap-2 ${textMuted}`}>
                    <Activity size={10} /> System
                  </span>
                  <Trash2 size={10} className={`${textMuted} hover:text-slate-500 cursor-pointer`} />
               </div>
               <div className="flex-1 overflow-y-auto p-2 space-y-1.5 font-mono text-[9px]">
                  {SYSTEM_LOGS.map((log, i) => (
                    <div key={i} className={`flex gap-1.5 border-b pb-1 last:border-0 ${isDarkMode ? 'border-slate-800' : 'border-slate-50'}`}>
                       <span className="text-slate-500">{log.time}</span>
                       <div className={`flex-1 leading-tight ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                         {log.type === 'info' && <span className="text-blue-500 font-bold mr-1">i</span>}
                         {log.type === 'success' && <span className="text-emerald-500 font-bold mr-1">v</span>}
                         {log.type === 'warning' && <span className="text-amber-500 font-bold mr-1">!</span>}
                         {log.msg}
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>

          {/* --- RIGHT COLUMN (Unified OSC Traffic Log) --- */}
          <div className="flex-1 flex flex-col min-w-0">
            
            {/* Header */}
            <div className={`h-10 border-b-2 flex items-center justify-between px-3 shrink-0 shadow-sm z-10 ${rightPanelHeaderBg}`}>
               <div className="flex items-center gap-3 flex-1">
                 <Activity size={14} className={isDarkMode ? 'text-slate-500' : 'text-slate-700'} />
                 {/* Shortened Title */}
                 <span className={`text-xs font-black uppercase tracking-wide whitespace-nowrap ${titleText}`}>
                   Traffic Monitor
                 </span>
                 
                 {/* Direct Search Input */}
                 <div className="relative group flex-1 max-w-[200px]">
                     <Search size={10} className="absolute left-2 top-1.5 text-slate-500" />
                     <input 
                        className={`h-6 w-full border pl-6 pr-2 text-[10px] font-mono transition-all outline-none rounded-sm placeholder:text-slate-600 ${searchInputBg}`} 
                        placeholder="FILTER LOGS..." 
                     />
                 </div>
               </div>

               <div className="flex items-center gap-2">
                  {/* Smaller, Detached Auto Scroll Button */}
                  <button 
                    onClick={() => setIsAutoScroll(!isAutoScroll)}
                    className={`
                      h-6 flex items-center gap-1.5 px-2 rounded-sm text-[9px] font-bold uppercase transition-all
                      ${scrollBtnBg}
                    `}
                  >
                     {isAutoScroll ? <PlayCircle size={10} /> : <PauseCircle size={10} />}
                     Auto Scroll
                  </button>

                  <div className={`w-px h-4 mx-1 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`}></div>

                  <button className={`h-6 w-6 flex items-center justify-center rounded-sm transition-colors ${isDarkMode ? 'text-slate-600 hover:bg-rose-900/20 hover:text-rose-500' : 'hover:bg-red-50 hover:text-red-500 text-slate-400'}`}>
                    <Trash2 size={12} />
                  </button>
               </div>
            </div>

            {/* Split View */}
            <div className="flex-1 flex flex-col min-h-0">
               
               {/* TX */}
               <div className={`flex-1 flex flex-col min-h-0 ${txBg}`}>
                  <SectionHeader label="Outgoing (TX)" icon={ArrowUpRight} count={OSC_SENT_LOGS.length} isDark={isDarkMode} />
                  <div className={`flex-1 overflow-y-auto scrollbar-thin p-0 ${isDarkMode ? 'scrollbar-thumb-slate-700 scrollbar-track-black' : 'scrollbar-thumb-slate-300 scrollbar-track-slate-50'}`}>
                     <div className="px-3 py-1">
                        {OSC_SENT_LOGS.map((log, i) => <LogLine key={i} log={log} direction="TX" isDark={isDarkMode} />)}
                     </div>
                  </div>
               </div>

               {/* Divider */}
               <div className={`h-1 border-y shrink-0 cursor-row-resize ${isDarkMode ? 'bg-black border-slate-800 hover:bg-slate-800' : 'bg-slate-200 border-slate-300 hover:bg-slate-300'}`}></div>

               {/* RX */}
               <div className={`flex-1 flex flex-col min-h-0 ${rxBg}`}>
                  <SectionHeader label="Incoming (RX)" icon={ArrowDownLeft} count={OSC_RECV_LOGS.length} isDark={isDarkMode} />
                  <div className={`flex-1 overflow-y-auto scrollbar-thin p-0 ${isDarkMode ? 'scrollbar-thumb-slate-700 scrollbar-track-black' : 'scrollbar-thumb-slate-300 scrollbar-track-slate-100'}`}>
                     <div className="px-3 py-1">
                        {OSC_RECV_LOGS.map((log, i) => <LogLine key={i} log={log} direction="RX" isDark={isDarkMode} />)}
                     </div>
                  </div>
               </div>

            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default OscDebugger;