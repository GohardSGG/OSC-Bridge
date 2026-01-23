<script lang="ts">
    export let size = 24;
    export let color = "currentColor";
    export let strokeWidth = 2;
    export let className = "";
</script>

<svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    stroke={color}
    stroke-width={strokeWidth}
    stroke-linecap="round"
    stroke-linejoin="round"
    class={className}
>
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
</svg>
