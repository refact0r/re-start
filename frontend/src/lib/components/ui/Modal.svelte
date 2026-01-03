<script lang="ts">
    import type { Snippet } from 'svelte'
    import { X } from 'lucide-svelte'

    let {
        open = false,
        onClose,
        children,
    }: {
        open?: boolean
        onClose?: () => void
        children: Snippet
    } = $props()

    function handleOverlayClick() {
        onClose?.()
    }

    function handleContentClick(e: MouseEvent) {
        e.stopPropagation()
    }

    function handleKeyDown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            onClose?.()
        }
    }
</script>

{#if open}
    <div
        class="overlay"
        onclick={handleOverlayClick}
        onkeydown={handleKeyDown}
        role="presentation"
    >
        <div
            class="modal"
            onclick={handleContentClick}
            onkeydown={handleKeyDown}
            role="dialog"
            aria-modal="true"
            tabindex="-1"
        >
            <button class="close-btn" onclick={onClose}>
                <X size={16} />
            </button>
            <div class="content">
                {@render children()}
            </div>
        </div>
    </div>
{/if}

<style>
    .overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        backdrop-filter: blur(2px);
    }

    .modal {
        position: relative;
        background: var(--bg-1);
        border: 1px solid var(--txt-4);
        border-radius: 8px;
        padding: 1.5rem 2rem;
        min-width: 340px;
        max-width: 90vw;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    .close-btn {
        position: absolute;
        top: 0.75rem;
        right: 0.75rem;
        background: transparent;
        border: none;
        color: var(--txt-3);
        cursor: pointer;
        padding: 0.25rem;
    }

    .close-btn:hover {
        color: var(--txt-1);
    }

    .content {
        text-align: center;
    }
</style>
