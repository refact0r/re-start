<script lang="ts">
    import type { Snippet, Component } from 'svelte'
    import { fade, fly } from 'svelte/transition'

    interface Tab {
        id: string
        icon: Component
        title: string
    }

    let {
        open = false,
        title = '',
        tabs = [],
        activeTab = $bindable(''),
        width = '40rem',
        onClose,
        children,
        footer,
    }: {
        open?: boolean
        title?: string
        tabs?: Tab[]
        activeTab?: string
        width?: string
        onClose?: () => void
        children: Snippet
        footer?: Snippet
    } = $props()

    let tabElements = $state<Record<string, HTMLButtonElement>>({})
    let indicatorStyle = $state('')

    $effect(() => {
        const el = tabElements[activeTab]
        if (el) {
            indicatorStyle = `left: ${el.offsetLeft}px; width: ${el.offsetWidth}px`
        }
    })

    function handleKeydown(event: KeyboardEvent): void {
        if (event.key === 'Escape') {
            onClose?.()
        }
    }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
    <div
        class="backdrop"
        onclick={onClose}
        onkeydown={(e) => e.key === 'Enter' && onClose?.()}
        role="button"
        tabindex="0"
        transition:fade={{ duration: 200 }}
    ></div>

    <div class="drawer" style:width transition:fly={{ x: 640, duration: 200 }}>
        <div class="header">
            <h2>{title}</h2>
            <button class="close-btn" onclick={onClose}>x</button>
        </div>

        {#if tabs.length > 0}
            <nav class="tabs">
                {#each tabs as tab (tab.id)}
                    <button
                        class="tab"
                        class:active={activeTab === tab.id}
                        onclick={() => (activeTab = tab.id)}
                        title={tab.title}
                        bind:this={tabElements[tab.id]}
                    >
                        <tab.icon size={18} strokeWidth={2} />
                    </button>
                {/each}
                <div class="tab-indicator" style={indicatorStyle}></div>
            </nav>
        {/if}

        <div class="content">
            {@render children()}

            {#if footer}
                <div class="footer">
                    {@render footer()}
                </div>
            {/if}
        </div>
    </div>
{/if}

<style>
    .backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 999;
    }

    .drawer {
        position: fixed;
        top: 0;
        right: 0;
        height: 100%;
        background: var(--bg-1);
        border-left: 2px solid var(--bg-3);
        z-index: 1000;
        display: flex;
        flex-direction: column;
    }

    .header {
        padding: 0.75rem 1rem 0.75rem 1.5rem;
        border-bottom: 2px solid var(--bg-3);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .header h2 {
        margin: 0;
    }

    .close-btn {
        padding: 0 0.5rem;
        font-size: 1.5rem;
        line-height: 2.25rem;
        font-weight: 300;
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
    }

    .close-btn:hover {
        color: var(--txt-1);
    }

    .tabs {
        position: relative;
        display: flex;
        border-bottom: 2px solid var(--bg-3);
        padding: 0 1rem;
    }

    .tab {
        display: flex;
        align-items: center;
        padding: 0.75rem 1rem;
        color: var(--txt-3);
        background: none;
        border: none;
        cursor: pointer;
        transition: color 0.15s ease;
    }

    .tab:hover {
        color: var(--txt-2);
    }

    .tab.active {
        color: var(--txt-1);
    }

    .tab-indicator {
        position: absolute;
        bottom: -2px;
        height: 2px;
        background: var(--txt-2);
        transition:
            left 0.2s ease,
            width 0.2s ease;
    }

    .content {
        flex: 1;
        width: 100%;
        padding: 1.5rem;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: var(--bg-3) var(--bg-1);
        box-sizing: border-box;
    }

    .footer {
        color: var(--txt-3);
    }

    .footer :global(a) {
        color: var(--txt-2);
    }

    .footer :global(a:hover) {
        color: var(--txt-1);
    }

    .footer :global(button) {
        background: none;
        border: none;
        color: var(--txt-2);
        cursor: pointer;
        padding: 0;
        font-size: inherit;
        font-family: inherit;
    }

    .footer :global(button:hover) {
        color: var(--txt-1);
    }
</style>
