<script lang="ts">
    import type { Snippet } from 'svelte'

    let {
        padding = 'md',
        background = 'secondary',
        border = false,
        rounded = false,
        justify = 'start',
        gap = 'sm',
        marginBottom = false,
        children,
    }: {
        padding?: 'none' | 'sm' | 'md' | 'lg'
        background?: 'none' | 'primary' | 'secondary' | 'tertiary'
        border?: boolean
        rounded?: boolean
        justify?: 'start' | 'center' | 'end' | 'between'
        gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg'
        marginBottom?: boolean
        children: Snippet
    } = $props()
</script>

<div
    class="box padding-{padding} bg-{background} justify-{justify} gap-{gap}"
    class:border
    class:rounded
    class:margin-bottom={marginBottom}
>
    {@render children()}
</div>

<style>
    .box {
        display: flex;
        align-items: center;
    }

    .padding-none {
        padding: 0;
    }
    .padding-sm {
        padding: 0.5rem;
    }
    .padding-md {
        padding: 0.75rem;
    }
    .padding-lg {
        padding: 1rem;
    }

    .bg-none {
        background: transparent;
    }
    .bg-primary {
        background: var(--bg-1);
    }
    .bg-secondary {
        background: var(--bg-2);
    }
    .bg-tertiary {
        background: var(--bg-3);
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
        gap: 0.75rem;
    }
    .gap-lg {
        gap: 1rem;
    }

    .border {
        border: 1px solid var(--bg-3);
    }
    .rounded {
        border-radius: 6px;
    }
    .margin-bottom {
        margin-bottom: 0.5rem;
    }
</style>
