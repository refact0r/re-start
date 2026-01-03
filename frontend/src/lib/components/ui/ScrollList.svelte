<script lang="ts">
    import type { Snippet } from 'svelte'

    let {
        maxHeight = '15rem',
        children,
    }: {
        maxHeight?: string
        children: Snippet
    } = $props()
</script>

<div class="scroll-list" style:max-height={maxHeight}>
    {@render children()}
</div>

<style>
    .scroll-list {
        overflow: auto;
        scrollbar-width: none;
        scroll-snap-type: y proximity;
    }
</style>
