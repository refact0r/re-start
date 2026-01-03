<script lang="ts">
    import type { Snippet } from 'svelte'

    let {
        label = '',
        autoWidth = false,
        children,
    }: {
        label?: string
        autoWidth?: boolean
        children: Snippet
    } = $props()
</script>

<div class="group" class:auto-width={autoWidth}>
    {#if label}
        <div class="label">{label}</div>
    {/if}
    {@render children()}
</div>

<style>
    .group {
        width: 100%;
        margin-bottom: 1.5rem;
    }

    .group.auto-width {
        flex: 0 0 auto;
    }

    .label {
        display: block;
        margin-bottom: 0.5rem;
    }
</style>
