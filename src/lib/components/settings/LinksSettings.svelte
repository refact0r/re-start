<script>
    import { settings } from '../../settings-store.svelte.js'
    import RadioButton from '../RadioButton.svelte'

    let draggedIndex = $state(null)
    let dragOverIndex = $state(null)

    function addLink() {
        settings.links = [...settings.links, { title: '', url: '' }]
    }

    function removeLink(index) {
        settings.links = settings.links.filter((_, i) => i !== index)
    }

    function handleDragStart(event, index) {
        draggedIndex = index
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/html', event.currentTarget)
    }

    function handleDragOver(event, index) {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        dragOverIndex = index
    }

    function handleDragLeave() {
        dragOverIndex = null
    }

    function handleDrop(event, dropIndex) {
        event.preventDefault()

        if (draggedIndex !== null && draggedIndex !== dropIndex) {
            const newLinks = [...settings.links]
            const draggedItem = newLinks[draggedIndex]

            // Remove the dragged item
            newLinks.splice(draggedIndex, 1)

            // Insert at the new position
            if (draggedIndex < dropIndex) {
                newLinks.splice(dropIndex, 0, draggedItem)
            } else {
                // Dragging backward: place before target
                newLinks.splice(dropIndex, 0, draggedItem)
            }

            settings.links = newLinks
        }

        draggedIndex = null
        dragOverIndex = null
    }

    function handleDragEnd() {
        draggedIndex = null
        dragOverIndex = null
    }
</script>

<div class="group">
    <button class="checkbox-label" onclick={() => settings.showLinks = !settings.showLinks}>
        <span class="checkbox">{settings.showLinks ? '[x]' : '[ ]'}</span>
        enabled
    </button>
</div>

{#if settings.showLinks}
    <div class="inline-group">
        <div class="group">
            <div class="setting-label">open in</div>
            <div class="radio-group">
                <RadioButton bind:group={settings.linkTarget} value="_self">
                    same tab
                </RadioButton>
                <RadioButton
                    bind:group={settings.linkTarget}
                    value="_blank"
                >
                    new tab
                </RadioButton>
            </div>
        </div>
        <div class="group small">
            <label for="linksPerColumn">per column</label>
            <input
                id="linksPerColumn"
                type="number"
                bind:value={settings.linksPerColumn}
                step="1"
            />
        </div>
    </div>

    <div class="group">
        <div class="links-header">
            <div class="setting-label">edit links</div>
            <button class="add-btn" onclick={addLink}>+ add</button>
        </div>
        <div class="links-list">
            {#each settings.links as link, index}
                <div
                    class="link"
                    class:dragging={draggedIndex === index}
                    class:drag-over={dragOverIndex === index}
                    ondragover={(e) => handleDragOver(e, index)}
                    ondragleave={handleDragLeave}
                    ondrop={(e) => handleDrop(e, index)}
                    role="listitem"
                >
                    <span
                        class="drag-handle"
                        title="Drag to reorder"
                        draggable="true"
                        ondragstart={(e) => handleDragStart(e, index)}
                        ondragend={handleDragEnd}
                        role="button"
                        tabindex="0">=</span
                    >
                    <input
                        type="text"
                        bind:value={link.title}
                        placeholder="title"
                        class="link-input name"
                        draggable="false"
                    />
                    <input
                        type="url"
                        bind:value={link.url}
                        placeholder="https://example.com"
                        class="link-input"
                        draggable="false"
                    />
                    <button
                        class="remove-btn"
                        onclick={() => removeLink(index)}
                    >
                        x
                    </button>
                </div>
            {/each}
        </div>
    </div>
{/if}

<style>
    .group {
        width: 100%;
        margin-bottom: 1.5rem;
    }
    .group > label,
    .setting-label {
        display: block;
        margin-bottom: 0.5rem;
    }
    .group input[type='number'] {
        width: 100%;
        padding: 0.5rem;
        background: var(--bg-2);
        border: 2px solid var(--bg-3);
    }
    .radio-group {
        display: flex;
        gap: 3ch;
    }
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
    .checkbox-label .checkbox {
        color: var(--txt-2);
    }
    .inline-group {
        display: flex;
        gap: 1rem;
        margin-bottom: 1.5rem;
    }
    .inline-group .group {
        flex: 1;
        margin-bottom: 0;
    }
    .inline-group .group.small {
        flex: 0 0 8rem;
    }
    .links-header {
        display: flex;
        justify-content: space-between;
    }
    .add-btn {
        height: 1.5rem;
    }
    .link {
        display: flex;
        align-items: center;
        margin-bottom: calc(0.5rem - 2px);
        border: 2px solid transparent;
    }
    .link.dragging {
        opacity: 0.5;
        border: 2px dashed var(--txt-3);
    }
    .link.drag-over {
        border: 2px solid var(--txt-2);
    }
    .drag-handle {
        cursor: grab;
        padding: 0 0.5rem 0 0.25rem;
        color: var(--txt-3);
        user-select: none;
        font-size: 1.125rem;
        touch-action: none;
    }
    .drag-handle:active {
        cursor: grabbing;
    }
    .link .link-input {
        width: 100%;
        padding: 0.5rem;
        background: var(--bg-2);
        border: 2px solid var(--bg-3);
    }
    .link .link-input.name {
        width: 10rem;
        margin-right: 0.5rem;
    }
    .remove-btn {
        padding: 0 0.25rem 0 0.5rem;
        font-size: 1.125rem;
        font-weight: 300;
    }
</style>
