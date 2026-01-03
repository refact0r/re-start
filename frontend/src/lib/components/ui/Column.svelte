<script lang="ts">
    import type { Snippet } from 'svelte'

    type Gap = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    type Align = 'start' | 'center' | 'end' | 'stretch'

    let {
        children,
        gap = 'none',
        align = 'stretch',
        flex,
    }: {
        children: Snippet
        gap?: Gap
        align?: Align
        flex?: number | string
    } = $props()

    const style = flex !== undefined ? `flex: ${flex}` : undefined
</script>

<div class="column gap-{gap} align-{align}" {style}>
    {@render children()}
</div>

<style>
    .column {
        display: flex;
        flex-direction: column;
    }

    .gap-none {
        gap: 0;
    }
    .gap-xs {
        gap: 0.25rem;
    }
    .gap-sm {
        gap: 0.5rem;
    }
    .gap-md {
        gap: 1rem;
    }
    .gap-lg {
        gap: 1.5rem;
    }
    .gap-xl {
        gap: 2rem;
    }

    .align-start {
        align-items: flex-start;
    }
    .align-center {
        align-items: center;
    }
    .align-end {
        align-items: flex-end;
    }
    .align-stretch {
        align-items: stretch;
    }
</style>
