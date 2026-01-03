<script lang="ts">
    import type { Snippet } from 'svelte'

    let {
        disabled = false,
        hint = '',
        children,
    }: {
        disabled?: boolean
        hint?: string
        children: Snippet
    } = $props()
</script>

<span class="hint-wrapper" class:disabled title={disabled ? hint : ''}>
    {@render children()}
</span>

<style>
    .hint-wrapper.disabled {
        cursor: help;
    }
</style>
