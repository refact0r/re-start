<script>
    import { onDestroy, onMount } from 'svelte'
    import { settings } from '../stores/settings-store.svelte.js'
    import { isValidSlug } from '../utils/link-icons.js'

    let launcherInput = $state('')
    let launcherFeedback = $state('')
    let launcherInputEl = $state(null)
    let feedbackTimeoutId = null

    const columns = $derived.by(() => {
        const result = []
        const linksPerColumn = Math.max(
            1,
            parseInt(settings.linksPerColumn) || 1
        )
        for (let i = 0; i < settings.links.length; i += linksPerColumn) {
            result.push(settings.links.slice(i, i + linksPerColumn))
        }
        return result
    })

    function showLauncherFeedback(message) {
        launcherFeedback = message
        if (feedbackTimeoutId) {
            clearTimeout(feedbackTimeoutId)
        }
        feedbackTimeoutId = setTimeout(() => {
            launcherFeedback = ''
            feedbackTimeoutId = null
        }, 2200)
    }

    function parseLauncherInput(rawInput) {
        const input = rawInput.trim()
        if (!input) {
            return { error: 'use /c <prompt>' }
        }

        if (input === '/c') {
            return { error: 'add a prompt after /c' }
        }

        if (!input.startsWith('/c ')) {
            return { error: 'command format: /c <prompt>' }
        }

        const query = input.slice(3).trim()
        if (!query) {
            return { error: 'add a prompt after /c' }
        }

        return { query }
    }

    function buildChatGptUrl(query) {
        const params = new URLSearchParams()
        params.set('restart_autosend', '1')
        params.set('restart_request', `${Date.now()}-${Math.random()}`)
        params.set('restart_prompt', query)
        return `https://chatgpt.com/#${params.toString()}`
    }

    function handleLauncherSubmit(event) {
        event.preventDefault()
        const parsed = parseLauncherInput(launcherInput)
        if (parsed.error) {
            showLauncherFeedback(parsed.error)
            return
        }

        const url = buildChatGptUrl(parsed.query)
        const popup = window.open(url, '_blank', 'noopener,noreferrer')

        if (!popup) {
            showLauncherFeedback('popup blocked: allow popups for this page')
            return
        }

        showLauncherFeedback('opened ChatGPT and auto-sent')
        launcherInput = ''
    }

    function focusLauncherInput() {
        launcherInputEl?.focus()
        launcherInputEl?.select()
    }

    function handleGlobalKeydown(event) {
        if (!(event.ctrlKey || event.metaKey)) return
        if (event.key.toLowerCase() !== 'k') return

        const activeElement = document.activeElement
        const isTypingTarget =
            activeElement?.tagName === 'INPUT' ||
            activeElement?.tagName === 'TEXTAREA' ||
            (activeElement instanceof HTMLElement &&
                activeElement.isContentEditable)

        if (isTypingTarget) return
        event.preventDefault()
        focusLauncherInput()
    }

    onMount(() => {
        document.addEventListener('keydown', handleGlobalKeydown)
    })

    onDestroy(() => {
        document.removeEventListener('keydown', handleGlobalKeydown)
        if (feedbackTimeoutId) {
            clearTimeout(feedbackTimeoutId)
            feedbackTimeoutId = null
        }
    })
</script>

<div class="panel-wrapper">
    <div class="panel-label">links</div>
    <div class="panel">
        <form class="launcher" onsubmit={handleLauncherSubmit}>
            <span class="launcher-prefix">&gt;</span>
            <input
                bind:this={launcherInputEl}
                bind:value={launcherInput}
                class="launcher-input"
                type="text"
                placeholder="/c your prompt here... (ctrl+k focus)"
                aria-label="ChatGPT command launcher"
            />
            <button type="submit" class="launcher-open">open</button>
        </form>
        {#if launcherFeedback}
            <div class="launcher-feedback">{launcherFeedback}</div>
        {/if}
        <br />
        {#each columns as column}
            <div
                class="column"
                class:icon-mode={settings.linkIconMode === 'icons'}
            >
                {#each column as link}
                    <a
                        href={link.url}
                        target={settings.linkTarget}
                        rel="noopener noreferrer"
                        class="link"
                    >
                        {#if settings.linkIconMode === 'icons' && isValidSlug(link.icon)}
                            <span class="icon si si-{link.icon}"></span>
                        {:else}
                            <span class="prefix">></span>
                        {/if}
                        {link.title}
                    </a>
                    <br />
                {/each}
            </div>
        {/each}
    </div>
</div>

<style>
    .panel {
        display: flex;
        flex-wrap: wrap;
        gap: 1.5rem;
    }
    .launcher {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    .launcher-prefix {
        color: var(--txt-3);
    }
    .launcher-input {
        flex: 1;
        min-width: 0;
        background: var(--bg-2);
        border: 2px solid var(--bg-3);
        padding: 0.25rem 0.5rem;
    }
    .launcher-input:focus {
        border-color: var(--txt-3);
    }
    .launcher-input::placeholder {
        color: var(--txt-4);
    }
    .launcher-open {
        color: var(--txt-2);
    }
    .launcher-feedback {
        width: 100%;
        color: var(--txt-3);
        margin-top: -1rem;
        margin-bottom: -0.25rem;
    }
    .link:hover .prefix,
    .link:hover .icon {
        color: var(--txt-2);
    }
    .prefix,
    .icon {
        display: inline-block;
        color: var(--txt-3);
        text-align: center;
    }
    .icon-mode .prefix,
    .icon {
        width: 1.25rem;
    }
    .icon {
        font-size: 0.875rem;
        vertical-align: text-bottom;
    }
    .column {
        flex-grow: 1;
    }
</style>
