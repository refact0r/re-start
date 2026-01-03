<script lang="ts">
    interface HighlightMatch {
        start: number
        end: number
    }

    let {
        value = $bindable(''),
        match = null,
        placeholder = '',
        disabled = false,
        prefix = '',
        show = false,
        onsubmit,
        oninput,
    }: {
        value: string
        match?: HighlightMatch | null
        placeholder?: string
        disabled?: boolean
        prefix?: string
        show?: boolean
        onsubmit?: (event: SubmitEvent) => void
        oninput?: (value: string) => void
    } = $props()

    const handleSubmit = (event: SubmitEvent) => {
        event.preventDefault()
        onsubmit?.(event)
    }

    const handleInput = (event: Event) => {
        oninput?.((event.target as HTMLInputElement).value)
    }

    const before = $derived(match ? value.slice(0, match.start) : value)
    const matchedText = $derived(
        match ? value.slice(match.start, match.end) : ''
    )
    const after = $derived(match ? value.slice(match.end) : '')
    const showPlaceholder = $derived(!value)
</script>

<form class:show onsubmit={handleSubmit}>
    {#if prefix}
        <span class="prefix">{prefix}</span>
    {/if}
    <div class="input-shell">
        <div class="input-overlay" aria-hidden="true">
            {#if showPlaceholder}
                <span class="placeholder">{placeholder}</span>
            {:else if match}
                <span>{before}</span><span class="highlight">{matchedText}</span
                ><span>{after}</span>
            {:else}
                <span>{value}</span>
            {/if}
        </div>
        <input
            class="input"
            type="text"
            bind:value
            {placeholder}
            oninput={handleInput}
            {disabled}
            aria-label={placeholder}
            autocomplete="off"
        />
    </div>
</form>

<style>
    form {
        opacity: 0;
        display: flex;
        gap: 1ch;
        flex: 1;
        align-items: center;
    }

    form:hover,
    form:focus-within {
        opacity: 1;
    }

    form.show {
        opacity: 1;
    }

    .prefix {
        color: var(--txt-3);
    }

    .input-shell {
        position: relative;
        flex: 1;
        min-width: 0;
    }

    .input-overlay {
        position: absolute;
        inset: 0;
        pointer-events: none;
        white-space: pre;
        overflow: hidden;
        font: inherit;
        color: var(--txt-2);
        line-height: 1.5;
    }

    .placeholder {
        color: var(--txt-3);
    }

    .highlight {
        color: var(--txt-1);
    }

    .input {
        flex: 1;
        background: transparent;
        padding: 0;
        border: none;
        color: transparent;
        caret-color: var(--txt-1);
        height: 1.5rem;
        width: 100%;
        font: inherit;
    }

    .input::placeholder {
        color: transparent;
    }

    .input:disabled {
        opacity: 0.5;
    }
</style>
