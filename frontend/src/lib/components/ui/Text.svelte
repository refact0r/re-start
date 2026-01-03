<script lang="ts">
    import type { Snippet } from 'svelte'

    type Size = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl'
    type Color =
        | 'primary'
        | 'secondary'
        | 'muted'
        | 'faint'
        | 'error'
        | 'accent'
    type Weight = 'light' | 'normal' | 'medium' | 'bold'

    let {
        children,
        size = 'base',
        color = 'secondary',
        weight = 'normal',
        as = 'span',
        flex = false,
        content = false,
        shrink = true,
        minWidth,
    }: {
        children: Snippet
        size?: Size
        color?: Color
        weight?: Weight
        as?: 'span' | 'div' | 'p'
        flex?: boolean
        content?: boolean
        shrink?: boolean
        minWidth?: string
    } = $props()
</script>

<svelte:element
    this={as}
    class="text size-{size} color-{color} weight-{weight}"
    class:flex
    class:content
    class:no-shrink={!shrink}
    style:min-width={minWidth}
>
    {@render children()}
</svelte:element>

<style>
    .text {
        margin: 0;
    }

    .flex {
        flex: 1 1 auto;
        min-width: 0;
    }

    .size-xs {
        font-size: 0.75rem;
        line-height: 1rem;
    }
    .size-sm {
        font-size: 0.875rem;
        line-height: 1.25rem;
    }
    .size-base {
        font-size: 1rem;
        line-height: 1.5rem;
    }
    .size-lg {
        font-size: 1.25rem;
        line-height: 1.75rem;
    }
    .size-xl {
        font-size: 1.5rem;
        line-height: 2rem;
    }
    .size-2xl {
        font-size: 2rem;
        line-height: 2.625rem;
    }
    .size-3xl {
        font-size: 3.125rem;
        line-height: 3.5rem;
    }

    .color-primary {
        color: var(--txt-1);
    }
    .color-secondary {
        color: var(--txt-2);
    }
    .color-muted {
        color: var(--txt-3);
    }
    .color-faint {
        color: var(--txt-4);
    }
    .color-error {
        color: var(--txt-err);
    }
    .color-accent {
        color: var(--txt-accent, var(--txt-1));
    }

    .no-shrink {
        flex-shrink: 0;
    }

    .weight-light {
        font-weight: 300;
    }
    .weight-normal {
        font-weight: 400;
    }
    .weight-medium {
        font-weight: 500;
    }
    .weight-bold {
        font-weight: 600;
    }
</style>
