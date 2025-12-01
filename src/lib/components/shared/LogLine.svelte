<script lang="ts">
  // --- Type Definitions ---
  type Log = {
    time: string;
    target?: string;
    source?: string;
    path: string;
    val: string;
    type: string;
    // Allow any other properties from backend
    [key: string]: any;
  };

  export let log: Log;
  export let direction: "TX" | "RX" = "TX";
  export let isDark: boolean;

  function getDisplayValue(log: Log): string {
    if (log.val != null) return log.val;
    if (log.args && log.args.length > 0) {
      return log.args.map((a: any) => a.value).join(', ');
    }
    return '';
  }

  function getDisplayType(log: Log): string {
    if (log.type) return log.type;
    if (log.args && log.args.length > 0) {
      return log.args.map((a: any) => a.type).join(', ');
    }
    return 'Unknown';
  }

  // --- Helper Function ---
  const getTypeStyles = (type: string, isDark: boolean) => {
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
      // Light Mode
      switch(type) {
        case 'Float': return 'bg-teal-50 text-teal-700 border-teal-200'; 
        case 'Int': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
        case 'String': return 'bg-amber-50 text-amber-700 border-amber-200';
        case 'Blob': return 'bg-rose-50 text-rose-700 border-rose-200';
        default: return 'bg-slate-50 text-slate-600 border-slate-200';
      }
    }
  };
</script>

<div class="
  font-mono text-[10px] py-0.5 border-b flex items-center group cursor-default select-text transition-colors
  {isDark 
    ? 'border-slate-800 hover:bg-white/5 text-slate-400' 
    : 'border-slate-100 hover:bg-yellow-50 text-slate-700'}
">
  <!-- Time -->
  <span class="w-[52px] shrink-0 text-right font-medium mr-2 {isDark ? 'text-slate-600' : 'text-slate-300'}">[{log.time}]</span>
  
  <!-- Source/Target Indicator -->
  <div class="
    shrink-0 px-1.5 py-px text-[9px] font-bold border mr-2
    {direction === 'TX' 
       ? (isDark ? 'bg-blue-950/40 text-blue-400 border-blue-900' : 'bg-blue-50 text-blue-700 border-blue-200')
       : (isDark ? 'bg-purple-950/40 text-purple-400 border-purple-900' : 'bg-purple-50 text-purple-700 border-purple-200')}
  ">
     {direction === 'TX' ? log.target || log.source_id : log.source || log.source_id}
  </div>

  <!-- Message Content -->
  <div class="flex items-center">
     <span class="font-semibold {isDark ? 'text-amber-500' : 'text-amber-700'}">{log.path || log.addr}</span>
     <span class="mx-1.5 {isDark ? 'text-slate-700' : 'text-slate-300'}">·</span>
     <span class="font-bold {isDark ? 'text-emerald-400' : 'text-emerald-600'}">{getDisplayValue(log)}</span>
  </div>
  
  <!-- Spacer -->
  <div class="flex-1"></div>
  
  <!-- Type Indicator -->
  <div class="
     shrink-0 px-1.5 py-px text-[9px] font-bold border ml-2
     {getTypeStyles(getDisplayType(log), isDark)}
  ">
     {getDisplayType(log)}
  </div>
</div>
