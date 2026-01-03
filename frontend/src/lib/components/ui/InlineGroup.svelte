<script lang="ts">
    import type { Snippet } from 'svelte'

    let {
        children,
    }: {
        children: Snippet
    } = $props()
</script>

<div class="inline-group">
    {@render children()}
</div>

<style>
    .inline-group {
        display: flex;
        gap: 1rem;
        margin-bottom: 1.5rem;
    }

    .inline-group :global(.group) {
        flex: 1;
        margin-bottom: 0;
    }

    .inline-group :global(.group.auto-width) {
        flex: 0 0 auto;
    }
</style>
