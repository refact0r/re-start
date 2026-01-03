<script lang="ts">
    import type { Snippet } from 'svelte'

    let {
        first = false,
        children,
    }: {
        first?: boolean
        children: Snippet
    } = $props()
</script>

<h3 class="section-title" class:first>
    {@render children()}
</h3>

<style>
    .section-title {
        margin: 2rem 0 1rem 0;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid var(--bg-3);
        color: var(--txt-2);
        font-size: 0.875rem;
        font-weight: normal;
        text-transform: uppercase;
        letter-spacing: 0.1em;
    }

    .section-title.first {
        margin-top: 0;
    }
</style>
