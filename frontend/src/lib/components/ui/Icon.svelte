<script lang="ts">
    import type { Snippet } from 'svelte'

    let {
        size = 14,
        children,
    }: {
        size?: number
        children: Snippet
    } = $props()
</script>

<span class="icon" style:width="{size}px" style:height="{size}px">
    {@render children()}
</span>

<style>
    .icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .icon :global(svg) {
        width: 100%;
        height: 100%;
    }
</style>
