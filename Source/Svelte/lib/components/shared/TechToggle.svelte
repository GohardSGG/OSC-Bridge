<script lang="ts">
    import { createEventDispatcher } from "svelte";

    export let checked = false;
    export let label: string;
    export let isDark: boolean;

    export let labelClass: string = "text-[10px]";

    const dispatch = createEventDispatcher();

    function toggle() {
        checked = !checked;
        dispatch("change", checked);
    }
</script>

<!-- Changed from button to div to remove full-width click -->
<div class="flex items-center justify-between w-full group">
    <span
        class="uppercase font-bold tracking-wider transition-colors {labelClass} {isDark
            ? 'text-slate-400'
            : 'text-slate-500'}">{label}</span
    >

    <!-- Toggle Track (Clickable Area) -->
    <button
        on:click={toggle}
        class="w-8 h-4 rounded-sm border transition-colors relative cursor-pointer {checked
            ? 'bg-emerald-500/20 border-emerald-500'
            : isDark
              ? 'bg-slate-800 border-slate-700 hover:border-slate-600'
              : 'bg-slate-200 border-slate-300 hover:border-slate-400'}"
        type="button"
    >
        <!-- Toggle Thumb -->
        <div
            class="absolute top-[1px] bottom-[1px] w-[12px] bg-current rounded-[1px] transition-all duration-200 {checked
                ? 'right-[1px] text-emerald-500'
                : isDark
                  ? 'right-[17px] text-slate-500'
                  : 'right-[17px] text-slate-400'}"
        ></div>
    </button>
</div>
