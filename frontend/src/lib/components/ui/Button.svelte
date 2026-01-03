<script lang="ts">
    import type { Snippet } from 'svelte'

    type Variant =
        | 'default'
        | 'text'
        | 'primary'
        | 'icon'
        | 'sync'
        | 'checkbox'
        | 'delete'

    let {
        onclick,
        disabled = false,
        variant = 'default',
        title,
        checked = false,
        spinning = false,
        children,
    }: {
        onclick?: () => void
        disabled?: boolean
        variant?: Variant
        title?: string
        checked?: boolean
        spinning?: boolean
        children?: Snippet
    } = $props()
</script>

<button
    class="button variant-{variant}"
    class:checked
    class:spinning
    {onclick}
    {disabled}
    {title}
>
    {#if variant === 'default' && children}
        [{@render children()}]
    {:else if variant === 'checkbox'}
        {#if checked}
            [<span class="check-x">x</span>]
        {:else}
            [ ]
        {/if}
    {:else if children}
        {@render children()}
    {/if}
</button>

<style>
    .button {
        background: none;
        border: none;
        padding: 0;
        font: inherit;
        color: var(--txt-3);
        cursor: pointer;
        transition:
            color 0.15s ease,
            opacity 0.15s ease;
    }

    .button:hover:not(:disabled) {
        color: var(--txt-2);
    }

    .button:disabled {
        cursor: not-allowed;
        opacity: 0.5;
    }

    /* Text variant - minimal styling */
    .variant-text {
        font-size: 0.85rem;
        color: var(--txt-2);
    }

    .variant-text:hover:not(:disabled) {
        color: var(--txt-1);
    }

    /* Primary variant - filled button */
    .variant-primary {
        display: inline-block;
        padding: 0.75rem 1.5rem;
        background: var(--txt-1);
        color: var(--bg-1);
        border-radius: 6px;
        font-size: 0.9rem;
        font-weight: 500;
    }

    .variant-primary:hover:not(:disabled) {
        opacity: 0.85;
        color: var(--bg-1);
    }

    /* Icon variant - small icon button */
    .variant-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.4rem;
        background: var(--bg-3);
        border: 1px solid var(--txt-4);
        border-radius: 4px;
        color: var(--txt-2);
    }

    .variant-icon:hover:not(:disabled) {
        color: var(--txt-1);
        background: var(--txt-4);
    }

    /* Sync variant - positioned in panel corner */
    .variant-sync {
        position: absolute;
        bottom: 0.25rem;
        right: 0.25rem;
        color: var(--txt-3);
        opacity: 0;
    }

    :global(.panel-wrapper:hover) .variant-sync {
        opacity: 1;
    }

    .variant-sync:hover:not(:disabled) {
        color: var(--txt-1);
    }

    .variant-sync.spinning :global(svg) {
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }

    /* Checkbox variant */
    .variant-checkbox {
        color: var(--txt-3);
    }

    .variant-checkbox:hover:not(:disabled) {
        color: var(--txt-2);
    }

    .check-x {
        color: var(--txt-2);
    }

    /* Delete variant - hidden until parent hover */
    .variant-delete {
        opacity: 0;
        pointer-events: none;
        color: var(--txt-3);
    }

    .variant-delete:hover {
        color: var(--txt-2);
    }

    :global(.list-item:hover) .variant-delete,
    :global(.list-item:focus-within) .variant-delete {
        opacity: 1;
        pointer-events: auto;
    }
</style>
