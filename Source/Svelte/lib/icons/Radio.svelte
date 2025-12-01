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
  <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9S15.2 1 19.1 4.9 23 15.2 19.1 19.1 8.8 23 4.9 19.1z"></path>
  <path d="M9.2 14.8l5.6-5.6"></path>
  <circle cx="12" cy="12" r="2"></circle>
</svg>
