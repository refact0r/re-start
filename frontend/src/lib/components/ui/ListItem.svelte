<script lang="ts">
    import type { Snippet } from 'svelte'

    type Align = 'start' | 'center' | 'baseline'

    let {
        completed = false,
        faded = false,
        align = 'baseline',
        marginBottom = false,
        children,
    }: {
        completed?: boolean
        faded?: boolean
        align?: Align
        marginBottom?: boolean
        children: Snippet
    } = $props()
</script>

<div
    class="list-item align-{align}"
    class:completed
    class:faded
    class:margin-bottom={marginBottom}
>
    {@render children()}
</div>

<style>
    .list-item {
        display: flex;
        gap: 1ch;
        max-width: 40rem;
        scroll-snap-align: start;
    }

    .align-start {
        align-items: flex-start;
    }
    .align-center {
        align-items: center;
    }
    .align-baseline {
        align-items: baseline;
    }

    .margin-bottom {
        margin-bottom: 0.25rem;
    }

    .faded {
        opacity: 0.5;
    }

    .list-item.completed :global(.content) {
        text-decoration: line-through;
    }
</style>
