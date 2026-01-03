<script lang="ts">
    import type { Snippet } from 'svelte'

    let {
        columns = 2,
        gap = 'md',
        noMargin = false,
        children,
    }: {
        columns?: number
        gap?: 'xs' | 'sm' | 'md' | 'lg'
        noMargin?: boolean
        children: Snippet
    } = $props()
</script>

<div
    class="grid-group gap-{gap}"
    class:no-margin={noMargin}
    style="--columns: {columns}"
>
    {@render children()}
</div>

<style>
    .grid-group {
        display: grid;
        grid-template-columns: repeat(var(--columns), 1fr);
    }

    .gap-xs {
        gap: 0.25rem;
    }
    .gap-sm {
        gap: 0.5rem;
    }
    .gap-md {
        gap: 1rem 2rem;
    }
    .gap-lg {
        gap: 1.5rem 3rem;
    }

    .grid-group:not(.no-margin) {
        margin-bottom: 1.5rem;
    }

    .grid-group :global(.group) {
        margin-bottom: 0;
    }
</style>
