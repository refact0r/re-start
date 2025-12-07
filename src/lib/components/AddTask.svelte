<script>
    import { createEventDispatcher } from 'svelte'

    export let value = ''
    export let parsed = null
    export let placeholder = 'new task'
    export let disabled = false
    export let loading = false

    const dispatch = createEventDispatcher()

    const handleSubmit = (event) => {
        event.preventDefault()
        dispatch('submit')
    }

    const handleInput = (event) => {
        dispatch('input', event.target.value)
    }

    $: match = parsed?.match
    $: before = match ? value.slice(0, match.start) : value
    $: matchedText = match ? value.slice(match.start, match.end) : ''
    $: after = match ? value.slice(match.end) : ''
    $: showPlaceholder = !value
</script>

<form class="add-task-form" onsubmit={handleSubmit}>
    <span class="dark">+</span>
    <div class="input-shell">
        <div class="input-overlay" aria-hidden="true">
            {#if showPlaceholder}
                <span class="placeholder">{placeholder}</span>
            {:else if match}
                <span>{before}</span><span class="date-highlight"
                    >{matchedText}</span
                ><span>{after}</span>
            {:else}
                <span>{value}</span>
            {/if}
        </div>
        <input
            class="add-task-input"
            type="text"
            bind:value
            {placeholder}
            oninput={handleInput}
            disabled={disabled || loading}
            aria-label="Add task"
            autocomplete="off"
        />
    </div>
</form>

<style>
    .add-task-form {
        opacity: 0;
        display: flex;
        gap: 1ch;
        transition: opacity 0.2s ease;
        flex: 1;
        align-items: center;
    }
    .add-task-form:hover,
    .add-task-form:focus-within {
        opacity: 1;
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
    .date-highlight {
        color: var(--txt-1);
    }
    .add-task-input {
        flex: 1;
        background: transparent;
        padding: 0;
        border: none;
        color: transparent;
        caret-color: var(--txt-1);
        height: 1.5rem;
        width: 100%;
    }
    .add-task-input::placeholder {
        color: transparent;
    }
    .add-task-input:disabled {
        opacity: 0.5;
    }
</style>
