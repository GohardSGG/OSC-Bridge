<script lang="ts">
    import { isDarkMode } from "$lib/stores/stores";

    export let icon: any; // Svelte component
    export let label: string;
    export let count: number;
    export let items: string[];
    export let colorClass: string = "text-emerald-400";
    export let borderColorClass: string = "group-hover:border-emerald-500/50";

    // Dynamic Popover Background (Matching SettingsModal)
    // Dark: bg-[#18181b] border-2 border-slate-900
    // Light: bg-white border-2 border-slate-900
    $: popoverBg = $isDarkMode
        ? "bg-[#18181b] border-slate-900 text-slate-300 shadow-2xl border-2"
        : "bg-white border-slate-900 text-slate-600 shadow-xl border-2";

    $: headerBorderColor = $isDarkMode
        ? "border-slate-800"
        : "border-slate-200";
    $: itemHoverColor = $isDarkMode
        ? "hover:bg-emerald-500/10"
        : "hover:bg-slate-100";
    $: itemTextColor = $isDarkMode
        ? "text-slate-400 group-hover/item:text-slate-200"
        : "text-slate-500 group-hover/item:text-slate-800";
</script>

<div class="relative group h-full" data-tauri-drag-region>
    <!-- Pill Trigger -->
    <div
        class="
        h-full
        transition-all duration-200 cursor-help
        flex items-center gap-2
    "
    >
        <!-- Icon & Label -->
        <div class="flex items-center gap-1.5 {colorClass}">
            <svelte:component this={icon} size={12} />
            <span
                class="text-[10px] uppercase font-bold tracking-wider text-slate-400 group-hover:text-white transition-colors"
                class:text-slate-500={!$isDarkMode}
                class:group-hover:text-black={!$isDarkMode}
            >
                {label}
            </span>
        </div>

        <!-- Separator -->
        <div
            class="h-3 w-px bg-slate-700/50 group-hover:bg-slate-500 transition-colors"
            class:bg-slate-300={!$isDarkMode}
        ></div>

        <!-- Count Badge -->
        <span
            class="text-[10px] font-mono font-bold text-slate-300 min-w-[1ch] text-center group-hover:text-white transition-colors"
            class:text-slate-500={!$isDarkMode}
            class:group-hover:text-black={!$isDarkMode}
        >
            {count}
        </span>
    </div>

    <!-- Hover Popover (No Arrow, Dynamic Theme) -->
    <div
        class="
        absolute top-full left-1/2 -translate-x-1/2
        opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto
        transition-opacity duration-200 ease-out z-[100]
        min-w-[180px] rounded-sm border-2 py-2
        {popoverBg}
    "
    >
        <!-- Header -->
        <div
            class="px-3 py-1 mb-1 border-b {headerBorderColor} text-[10px] font-bold uppercase tracking-widest opacity-50 flex justify-between"
        >
            <span>Address</span>
            <span>Port</span>
        </div>

        <!-- List Items -->
        <div class="px-1 max-h-[200px] overflow-y-auto custom-scrollbar">
            {#if items.length > 0}
                {#each items as item}
                    <div
                        class="px-2 py-1 text-[10px] font-mono {itemHoverColor} rounded-sm flex justify-between gap-4 items-center group/item transition-colors"
                    >
                        {#if item.includes(":")}
                            <span class={itemTextColor}>
                                {item.split(":")[0]}
                            </span>
                            <span class="text-emerald-500/80 font-bold">
                                :{item.split(":")[1]}
                            </span>
                        {:else}
                            <span class="text-slate-400">{item}</span>
                        {/if}
                    </div>
                {/each}
            {:else}
                <div
                    class="px-2 py-2 text-[10px] italic text-center opacity-40"
                >
                    No active connections
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background-color: rgba(128, 128, 128, 0.2);
        border-radius: 4px;
    }
</style>
