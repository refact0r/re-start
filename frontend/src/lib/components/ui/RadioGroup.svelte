<script lang="ts">
    import type { Snippet } from 'svelte'

    let {
        children,
    }: {
        children: Snippet
    } = $props()
</script>

<div class="radio-group">
    {@render children()}
</div>

<style>
    .radio-group {
        display: flex;
        gap: 3ch;
    }
</style>
