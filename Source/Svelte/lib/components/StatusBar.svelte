<script lang="ts">
    import { isConnected } from "$lib/stores/stores";

    // Robust version handling
    const version = "v0.2.2";
</script>

<div
    class="h-4 w-full bg-[#09090b] border-t border-slate-900 flex items-center justify-between px-3 text-[10px] font-mono select-none z-50 shrink-0"
>
    <!-- Left: Status -->
    <div class="flex items-center gap-2">
        <div
            class="flex items-center gap-1.5 {$isConnected
                ? 'text-emerald-500'
                : 'text-slate-600'}"
        >
            <div
                class="w-1.5 h-1.5 rounded-full {$isConnected
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-slate-600'}"
            ></div>
            <span class="font-bold tracking-widest uppercase">
                {$isConnected ? "ONLINE" : "OFFLINE"}
            </span>
        </div>
    </div>

    <!-- Right: Version -->
    <div class="text-slate-600 font-bold tracking-wider opacity-50">
        {version}
    </div>
</div>
