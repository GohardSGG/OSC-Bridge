<script lang="ts">
  import { isDarkMode } from '$lib/stores/stores';
  import Injector from './Injector.svelte';
  import SystemLog from './SystemLog.svelte';
</script>

<div class="hidden md:flex w-64 border-r-2 flex-col shrink-0 {$isDarkMode ? 'bg-[#18181b] border-slate-800' : 'bg-slate-50 border-slate-300'}">
  <Injector />
  <SystemLog />
</div>
