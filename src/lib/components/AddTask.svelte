<script>
    let {
        value = $bindable(''),
        parsed = $bindable(null),
        parsedProject = null,
        placeholder = 'new task',
        disabled = false,
        loading = false,
        show = false,
        onsubmit = undefined,
        oninput = undefined,
    } = $props()

    let inputElement

    // Expose focus method to parent
    export function focus() {
        inputElement?.focus()
    }

    const handleSubmit = (event) => {
        event.preventDefault()
        onsubmit?.(event)
    }

    const handleInput = (event) => {
        oninput?.(event.target.value)
    }

    // Build text segments with multiple highlights
    const segments = $derived.by(() => {
        if (!value) return []

        const matches = []
        if (parsed?.match) {
            matches.push({ ...parsed.match, type: 'date' })
        }
        if (parsedProject?.match) {
            matches.push({ ...parsedProject.match, type: 'project' })
        }

        if (matches.length === 0) {
            return [{ text: value, type: 'text' }]
        }

        // Sort matches by start position
        matches.sort((a, b) => a.start - b.start)

        const result = []
        let pos = 0

        for (const match of matches) {
            // Add text before this match
            if (pos < match.start) {
                result.push({
                    text: value.slice(pos, match.start),
                    type: 'text',
                })
            }
            // Add the match
            result.push({
                text: value.slice(match.start, match.end),
                type: match.type,
            })
            pos = match.end
        }

        // Add remaining text
        if (pos < value.length) {
            result.push({ text: value.slice(pos), type: 'text' })
        }

        return result
    })

    const showPlaceholder = $derived(!value)
</script>

<form class:show onsubmit={handleSubmit}>
    <span class="dark">+</span>
    <div class="input-shell">
        <div class="input-overlay" aria-hidden="true">
            {#if showPlaceholder}
                <span class="placeholder">{placeholder}</span>
            {:else}
                {#each segments as segment}
                    {#if segment.type === 'date'}
                        <span class="date-highlight">{segment.text}</span>
                    {:else if segment.type === 'project'}
                        <span class="project-highlight">{segment.text}</span>
                    {:else}
                        <span>{segment.text}</span>
                    {/if}
                {/each}
            {/if}
        </div>
        <input
            bind:this={inputElement}
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
        color: var(--txt-3);
    }
    .project-highlight {
        color: var(--txt-3);
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
