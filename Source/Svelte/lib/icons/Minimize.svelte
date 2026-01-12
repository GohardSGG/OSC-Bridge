<script lang="ts">
    export let size: number = 24;
    export let color: string = "currentColor";
    export let strokeWidth: number = 2;
</script>

<svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    stroke-width={strokeWidth}
    stroke-linecap="round"
    stroke-linejoin="round"
    class={$$props.class}
>
    <!-- Simple horizontal line for minimize -->
    <line x1="4" y1="12" x2="20" y2="12"></line>
</svg>
