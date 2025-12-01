<script lang="ts">
    import { onMount, tick, onDestroy } from 'svelte';
    import { 
        isDarkMode, 
        oscSentLogs, 
        oscRecvLogs, 
        isAutoScroll,
        sentSearchTerm, 
        recvSearchTerm,
        filteredSentLogs,
        filteredRecvLogs
    } from '$lib/stores/stores';
    import Activity from '$lib/icons/Activity.svelte';
    import Search from '$lib/icons/Search.svelte';
    import PlayCircle from '$lib/icons/PlayCircle.svelte';
    import PauseCircle from '$lib/icons/PauseCircle.svelte';
    import Trash2 from '$lib/icons/Trash2.svelte';
    import ArrowUpRight from '$lib/icons/ArrowUpRight.svelte';
    import ArrowDownLeft from '$lib/icons/ArrowDownLeft.svelte';
    import SectionHeader from './shared/SectionHeader.svelte';
    import LogLine from './shared/LogLine.svelte';

    // DOM Elements
    let txLogContainer: HTMLDivElement;
    let rxLogContainer: HTMLDivElement;
    let txAnchor: HTMLDivElement;
    let rxAnchor: HTMLDivElement;

    // State tracks if the user is currently viewing the bottom of the list
    let txIsAtBottom = true;
    let rxIsAtBottom = true;
    
    let observer: IntersectionObserver;

    onMount(() => {
        // Create an observer to watch the "anchors" at the bottom of the logs
        observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.target === txAnchor) {
                    txIsAtBottom = entry.isIntersecting;
                }
                if (entry.target === rxAnchor) {
                    rxIsAtBottom = entry.isIntersecting;
                }
            });
        }, {
            root: null, // viewport (or scrollable ancestor)
            threshold: 0.1 // Trigger when even a tiny bit is visible
        });

        // Start observing once elements are bound
        if (txAnchor) observer.observe(txAnchor);
        if (rxAnchor) observer.observe(rxAnchor);
    });

    onDestroy(() => {
        if (observer) observer.disconnect();
    });

    // Reactive Logic for TX Scrolling
    $: if ($isAutoScroll && txIsAtBottom && $filteredSentLogs && txLogContainer) {
        scrollToBottom(txLogContainer);
    }

    // Reactive Logic for RX Scrolling
    $: if ($isAutoScroll && rxIsAtBottom && $filteredRecvLogs && rxLogContainer) {
        scrollToBottom(rxLogContainer);
    }

    async function scrollToBottom(container: HTMLDivElement) {
        await tick(); // Wait for DOM update to render new log
        container.scrollTo({ top: container.scrollHeight, behavior: 'instant' });
    }

    async function toggleAutoScroll() {
        const wasEnabled = $isAutoScroll;
        isAutoScroll.update(n => !n);
        
        // If enabling, force scroll to bottom immediately
        if (!wasEnabled) {
            await tick();
            if (txLogContainer) txLogContainer.scrollTop = txLogContainer.scrollHeight;
            if (rxLogContainer) rxLogContainer.scrollTop = rxLogContainer.scrollHeight;
        }
    }

    $: titleText = $isDarkMode ? 'text-slate-300' : 'text-slate-800';
    $: searchInputBg = $isDarkMode ? 'bg-[#09090b] border-slate-700 focus:bg-[#18181b] text-slate-300' : 'bg-slate-50 border-slate-200 focus:bg-white text-slate-800';
    $: scrollBtnBg = $isDarkMode ? ($isAutoScroll ? 'bg-slate-700 text-white' : 'bg-slate-900 text-slate-500') : ($isAutoScroll ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500');

</script>

<div class="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
    <!-- Header -->
    <div class="h-10 border-b-2 flex items-center justify-between px-3 shrink-0 shadow-sm z-10 {$isDarkMode ? 'bg-[#1e1e22] border-slate-800' : 'bg-white border-slate-300'}">
        <div class="flex items-center gap-3 flex-1">
            <Activity size={14} class={$isDarkMode ? 'text-slate-500' : 'text-slate-700'} />
            <span class="text-xs font-black uppercase tracking-wide whitespace-nowrap {titleText}">
                Traffic Monitor
            </span>
            <div class="relative group flex-1 max-w-[200px]">
                <Search size={10} class="absolute left-2 top-1.5 text-slate-500" />
                <input 
                    bind:value={$sentSearchTerm}
                    class="h-6 w-full border pl-6 pr-2 text-[10px] font-mono transition-all outline-none rounded-sm placeholder:text-slate-600 {searchInputBg}" 
                    placeholder="FILTER LOGS..." 
                />
            </div>
        </div>

        <div class="flex items-center gap-2">
            <button 
                on:click={toggleAutoScroll}
                class="h-6 flex items-center gap-1.5 px-2 rounded-sm text-[9px] font-bold uppercase transition-all {scrollBtnBg}"
            >
                {#if $isAutoScroll}
                    <PlayCircle size={10} />
                {:else}
                    <PauseCircle size={10} />
                {/if}
                Auto Scroll
            </button>

            <div class="w-px h-4 mx-1 {$isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}"></div>

            <button on:click={() => { oscSentLogs.set([]); oscRecvLogs.set([]); }} class="h-6 w-6 flex items-center justify-center rounded-sm transition-colors {$isDarkMode ? 'text-slate-600 hover:bg-rose-900/20 hover:text-rose-500' : 'hover:bg-red-50 hover:text-red-500 text-slate-400'}">
                <Trash2 size={12} />
            </button>
        </div>
    </div>

    <!-- Split View: Using Flex-Basis-0 Strategy for strict equality -->
    <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
        <!-- TX Panel -->
        <div class="flex-1 basis-0 min-h-0 flex flex-col {$isDarkMode ? 'bg-[#111113]' : 'bg-white'}">
            <SectionHeader label="Outgoing (TX)" icon={ArrowUpRight} count={$filteredSentLogs.length} isDark={$isDarkMode} />
            
            <div bind:this={txLogContainer} class="flex-1 overflow-y-auto scrollbar-thin p-0 {$isDarkMode ? 'scrollbar-thumb-slate-700 scrollbar-track-black' : 'scrollbar-thumb-slate-300 scrollbar-track-slate-50'}">
                <div class="px-3 py-1 pb-2">
                    {#each $filteredSentLogs.filter(log => log && log.id != null) as log (log.id)}
                        <LogLine {log} direction="TX" isDark={$isDarkMode} />
                    {/each}
                    <!-- Anchor element for intersection observer -->
                    <div bind:this={txAnchor} class="h-px w-full shrink-0"></div>
                </div>
            </div>
        </div>

        <!-- Divider -->
        <div class="h-1 border-y shrink-0 z-10 cursor-row-resize {$isDarkMode ? 'bg-black border-slate-800 hover:bg-slate-800' : 'bg-slate-200 border-slate-300 hover:bg-slate-300'}"></div>

        <!-- RX Panel -->
        <div class="flex-1 basis-0 min-h-0 flex flex-col {$isDarkMode ? 'bg-[#09090b]' : 'bg-[#fafafa]'}">
            <SectionHeader label="Incoming (RX)" icon={ArrowDownLeft} count={$filteredRecvLogs.length} isDark={$isDarkMode} />
            
            <div bind:this={rxLogContainer} class="flex-1 overflow-y-auto scrollbar-thin p-0 {$isDarkMode ? 'scrollbar-thumb-slate-700 scrollbar-track-black' : 'scrollbar-thumb-slate-100'}">
                <div class="px-3 py-1 pb-2">
                    {#each $filteredRecvLogs.filter(log => log && log.id != null) as log (log.id)}
                        <LogLine {log} direction="RX" isDark={$isDarkMode} />
                    {/each}
                    <!-- Anchor element for intersection observer -->
                    <div bind:this={rxAnchor} class="h-px w-full shrink-0"></div>
                </div>
            </div>
        </div>
    </div>
</div>