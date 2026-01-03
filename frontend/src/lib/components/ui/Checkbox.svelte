<script lang="ts">
    import type { Snippet } from 'svelte'

    let {
        checked = $bindable(),
        children,
    }: {
        checked: boolean
        children?: Snippet
    } = $props()
</script>

<button class="checkbox-label" onclick={() => (checked = !checked)}>
    <span class="checkbox">{checked ? '[x]' : '[ ]'}</span>
    {#if children}{@render children()}{/if}
</button>

<style>
    .checkbox-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        background: none;
        border: none;
        padding: 0;
        font: inherit;
        color: inherit;
        text-align: left;
    }

    .checkbox {
        color: var(--txt-2);
    }
</style>
