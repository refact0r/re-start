<script lang="ts">
    import type { Snippet } from 'svelte'

    type Gap = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    type Align = 'start' | 'center' | 'end' | 'baseline' | 'stretch'
    type Justify = 'start' | 'center' | 'end' | 'between' | 'around'

    let {
        children,
        gap = 'md',
        align = 'start',
        justify = 'start',
        wrap = false,
    }: {
        children: Snippet
        gap?: Gap
        align?: Align
        justify?: Justify
        wrap?: boolean
    } = $props()
</script>

<div class="row gap-{gap} align-{align} justify-{justify}" class:wrap>
    {@render children()}
</div>

<style>
    .row {
        display: flex;
        flex-direction: row;
    }

    .wrap {
        flex-wrap: wrap;
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
    .align-baseline {
        align-items: baseline;
    }
    .align-stretch {
        align-items: stretch;
    }

    .justify-start {
        justify-content: flex-start;
    }
    .justify-center {
        justify-content: center;
    }
    .justify-end {
        justify-content: flex-end;
    }
    .justify-between {
        justify-content: space-between;
    }
    .justify-around {
        justify-content: space-around;
    }
</style>
