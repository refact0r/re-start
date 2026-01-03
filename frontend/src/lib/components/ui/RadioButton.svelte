<script lang="ts">
    import type { Snippet } from 'svelte'

    let {
        group = $bindable(),
        value,
        disabled = false,
        children,
    }: {
        group: string
        value: string
        disabled?: boolean
        children?: Snippet
    } = $props()

    let isChecked = $derived(group === value)
</script>

<label class:disabled>
    <input type="radio" bind:group {value} {disabled} />
    <span class="radio-indicator">
        {#if isChecked}
            [<span class="radio-x">x</span>]
        {:else}
            [ ]
        {/if}
    </span>
    <span class="radio-content">
        {@render children?.()}
    </span>
</label>

<style>
    label {
        display: block;
        cursor: pointer;
    }

    label input[type='radio'] {
        display: none;
    }

    .radio-indicator {
        color: var(--txt-3);
    }

    .radio-indicator:hover {
        color: var(--txt-2);
    }

    .radio-x {
        color: var(--txt-2);
    }

    label:hover {
        .radio-indicator::before,
        .radio-indicator::after {
            color: var(--txt-2);
        }
    }

    label.disabled {
        cursor: not-allowed;
        opacity: 0.4;
    }

    label.disabled:hover {
        .radio-indicator,
        .radio-indicator::before,
        .radio-indicator::after {
            color: var(--txt-3);
        }
    }
</style>
