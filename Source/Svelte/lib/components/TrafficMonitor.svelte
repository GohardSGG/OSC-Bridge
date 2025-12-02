<script lang="ts">
    import { t } from 'svelte-i18n';
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
    let containerElement: HTMLDivElement;
    let txLogContainer: HTMLDivElement;
    let rxLogContainer: HTMLDivElement;
    let txAnchor: HTMLDivElement;
    let rxAnchor: HTMLDivElement;

    // Resizer Logic
    let isResizing = false;
    let txPanelHeightPercent = 50; // Initial height percentage

    function startResize(e: MouseEvent) {
        isResizing = true;
        window.addEventListener('mousemove', handleResize);
        window.addEventListener('mouseup', stopResize);
        // Prevent text selection during resize
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'row-resize';
    }

    function handleResize(e: MouseEvent) {
        if (!isResizing || !containerElement) return;
        
        const containerRect = containerElement.getBoundingClientRect();
        const relativeY = e.clientY - containerRect.top;
        const newPercent = (relativeY / containerRect.height) * 100;

        // Constraint the height between 10% and 90%
        if (newPercent >= 10 && newPercent <= 90) {
            txPanelHeightPercent = newPercent;
        }
    }

    function stopResize() {
        isResizing = false;
        window.removeEventListener('mousemove', handleResize);
        window.removeEventListener('mouseup', stopResize);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
    }

    // Scroll Observer Logic
    let txIsAtBottom = true;
    let rxIsAtBottom = true;
    let observer: IntersectionObserver;

    onMount(() => {
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
            root: null,
            threshold: 0.1
        });

        if (txAnchor) observer.observe(txAnchor);
        if (rxAnchor) observer.observe(rxAnchor);
    });

    onDestroy(() => {
        if (observer) observer.disconnect();
        // Clean up resize listeners just in case component is destroyed while dragging
        if (typeof window !== 'undefined') {
            window.removeEventListener('mousemove', handleResize);
            window.removeEventListener('mouseup', stopResize);
        }
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
        await tick();
        container.scrollTo({ top: container.scrollHeight, behavior: 'instant' });
    }

    async function toggleAutoScroll() {
        const wasEnabled = $isAutoScroll;
        isAutoScroll.update(n => !n);
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
                {$t('traffic_monitor.title')}
            </span>
            <div class="relative group flex-1 max-w-[200px]">
                <Search size={10} class="absolute left-2 top-0 bottom-0 my-auto text-slate-500" />
                <input 
                    bind:value={$sentSearchTerm}
                    class="h-6 w-full border pl-6 pr-2 text-[10px] font-mono transition-all outline-none rounded-sm placeholder:text-slate-600 {searchInputBg}" 
                    placeholder={$t('traffic_monitor.filter_logs')} 
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
                {$t('traffic_monitor.auto_scroll')}
            </button>

            <div class="w-px h-4 mx-1 {$isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}"></div>

            <button on:click={() => { oscSentLogs.set([]); oscRecvLogs.set([]); }} class="h-6 w-6 flex items-center justify-center rounded-sm transition-colors {$isDarkMode ? 'text-slate-600 hover:bg-rose-900/20 hover:text-rose-500' : 'hover:bg-red-50 hover:text-red-500 text-slate-400'}">
                <Trash2 size={12} />
            </button>
        </div>
    </div>

    <!-- Split View Container -->
    <div bind:this={containerElement} class="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        
        <!-- TX Panel (Height controlled by variable) -->
        <div style="height: {txPanelHeightPercent}%" class="flex flex-col min-h-0 overflow-hidden {$isDarkMode ? 'bg-[#111113]' : 'bg-white'}">
            <SectionHeader label={$t('traffic_monitor.outgoing')} icon={ArrowUpRight} count={$filteredSentLogs.length} isDark={$isDarkMode} />
            
            <div bind:this={txLogContainer} class="flex-1 overflow-y-auto p-0">
                <div class="px-3 py-1 pb-2">
                    {#each $filteredSentLogs.filter(log => log && log.id != null) as log (log.id)}
                        <LogLine {log} direction="TX" isDark={$isDarkMode} />
                    {/each}
                    <div bind:this={txAnchor} class="h-px w-full shrink-0"></div>
                </div>
            </div>
        </div>

        <!-- Draggable Divider -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div 
            on:mousedown={startResize}
            class="h-1 border-y shrink-0 z-20 cursor-row-resize transition-colors {isResizing ? 'bg-emerald-500 border-emerald-600' : ($isDarkMode ? 'bg-black border-slate-800 hover:bg-slate-700' : 'bg-slate-200 border-slate-300 hover:bg-slate-300')}"
        ></div>

        <!-- RX Panel (Takes remaining space) -->
        <div class="flex-1 flex flex-col min-h-0 overflow-hidden {$isDarkMode ? 'bg-[#09090b]' : 'bg-[#fafafa]'}">
            <SectionHeader label={$t('traffic_monitor.incoming')} icon={ArrowDownLeft} count={$filteredRecvLogs.length} isDark={$isDarkMode} />
            
            <div bind:this={rxLogContainer} class="flex-1 overflow-y-auto p-0">
                <div class="px-3 py-1 pb-2">
                    {#each $filteredRecvLogs.filter(log => log && log.id != null) as log (log.id)}
                        <LogLine {log} direction="RX" isDark={$isDarkMode} />
                    {/each}
                    <div bind:this={rxAnchor} class="h-px w-full shrink-0"></div>
                </div>
            </div>
        </div>
    </div>
</div>
