<script lang="ts">
    import { createEventDispatcher } from "svelte";

    export let checked = false;
    export let label: string;
    export let isDark: boolean;

    const dispatch = createEventDispatcher();

    function toggle() {
        checked = !checked;
        dispatch("change", checked);
    }
</script>

<button
    class="flex items-center justify-between w-full group cursor-pointer"
    on:click={toggle}
>
    <span
        class="text-[10px] uppercase font-bold tracking-wider transition-colors {isDark
            ? 'text-slate-400 group-hover:text-slate-300'
            : 'text-slate-500 group-hover:text-slate-700'}">{label}</span
    >

    <!-- Toggle Track -->
    <div
        class="w-8 h-4 rounded-sm border transition-colors relative {checked
            ? 'bg-emerald-500/20 border-emerald-500'
            : isDark
              ? 'bg-slate-800 border-slate-700'
              : 'bg-slate-200 border-slate-300'}"
    >
        <!-- Toggle Thumb -->
        <div
            class="absolute top-[1px] bottom-[1px] w-[12px] bg-current rounded-[1px] transition-all duration-200 {checked
                ? 'right-[1px] text-emerald-500'
                : isDark
                  ? 'right-[17px] text-slate-500'
                  : 'right-[17px] text-slate-400'}"
        ></div>
    </div>
</button>
