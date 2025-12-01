<script lang="ts">
  export let size: number = 24;
  export let color: string = 'currentColor';
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
  <circle cx="12" cy="12" r="10"></circle>
  <polygon points="10 8 16 12 10 16 10 8"></polygon>
</svg>
