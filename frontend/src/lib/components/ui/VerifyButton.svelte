<script lang="ts">
    let {
        onclick,
        verifying = false,
        verified = null,
        disabled = false,
    }: {
        onclick: () => void
        verifying?: boolean
        verified?: boolean | null
        disabled?: boolean
    } = $props()
</script>

<button
    class="verify-btn"
    class:valid={verified === true}
    class:invalid={verified === false}
    {onclick}
    disabled={verifying || disabled}
>
    {#if verifying}verifying...{:else if verified === true}valid{:else if verified === false}invalid{:else}verify{/if}
</button>

<style>
    .verify-btn {
        background: none;
        border: none;
        padding: 0;
        font: inherit;
        font-size: 0.7rem;
        color: var(--txt-3);
        cursor: pointer;
    }

    .verify-btn:hover:not(:disabled) {
        color: var(--txt-2);
    }

    .verify-btn:disabled {
        cursor: default;
    }

    .verify-btn.valid {
        color: #4ade80;
    }

    .verify-btn.invalid {
        color: var(--txt-err);
    }
</style>
