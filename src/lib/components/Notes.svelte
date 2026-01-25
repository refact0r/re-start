<script>
    import { settings, saveSettings } from '../stores/settings-store.svelte.js'

    let { class: className = '' } = $props()

    let isRevealed = $state(false)
    let debounceTimer = null

    function handleInput(event) {
        settings.notesContent = event.target.value

        // Debounced save
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
            saveSettings(settings)
        }, 500)
    }

    function handleBlur() {
        // Immediate save on blur
        if (debounceTimer) {
            clearTimeout(debounceTimer)
            debounceTimer = null
        }
        saveSettings(settings)
    }

    function reveal() {
        isRevealed = true
    }

    function hide() {
        isRevealed = false
    }
</script>

<div
    class="panel-wrapper {className}"
    onmouseenter={reveal}
    onmouseleave={hide}
    onfocusin={reveal}
    onfocusout={hide}
    role="group"
>
    <div class="panel-label">notes</div>
    <div class="panel">
        {#if isRevealed}
            <textarea
                class="notes-textarea"
                value={settings.notesContent}
                oninput={handleInput}
                onblur={handleBlur}
                placeholder="jot something down..."
            ></textarea>
        {:else}
            <div class="notes-masked">•••</div>
        {/if}
    </div>
</div>

<style>
    .panel-wrapper {
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        width: 12rem;
    }
    .panel-wrapper.expand {
        flex-grow: 1;
    }
    .panel-wrapper :global(.panel) {
        display: flex;
        flex-direction: column;
        flex: 1;
    }
    .notes-textarea {
        width: 100%;
        flex: 1;
        min-height: 8rem;
        background: transparent;
        border: none;
        color: var(--txt-1);
        font-family: var(--font-family);
        font-size: 0.875rem;
        line-height: 1.5;
        resize: none;
        outline: none;
    }
    .notes-textarea::placeholder {
        color: var(--txt-3);
    }
    .notes-masked {
        width: 100%;
        flex: 1;
        min-height: 8rem;
        color: var(--txt-3);
        font-family: var(--font-family);
        font-size: 0.875rem;
        line-height: 1.5;
        filter: blur(4px);
    }
</style>
