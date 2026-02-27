<script>
    import { validSlugs } from '../utils/simple-icons-slugs.js'
    import { guessIconSlug } from '../utils/link-icons.js'
    import { tick } from 'svelte'

    let { icon = '', url = '', onselect } = $props()

    let search = $state('')
    let searchInput = $state(null)

    const allSlugs = Array.from(validSlugs)
    const MAX_RESULTS = 60

    let filtered = $derived.by(() => {
        const q = search.trim().toLowerCase()
        if (!q) return allSlugs.slice(0, MAX_RESULTS)
        const results = []
        for (const slug of allSlugs) {
            if (slug.includes(q)) results.push(slug)
            if (results.length >= MAX_RESULTS) break
        }
        return results
    })

    let guessed = $derived(guessIconSlug(url))

    let suggestions = $derived.by(() => {
        if (search.trim()) return filtered
        const top = []
        if (guessed) top.push(guessed)
        const rest = filtered.filter((s) => !top.includes(s))
        return [...top, ...rest].slice(0, MAX_RESULTS)
    })

    export async function focusInput() {
        await tick()
        searchInput?.focus()
    }

    function handleKeydown(e) {
        if (e.key === 'Escape') onselect(icon)
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="icon-picker" onkeydown={handleKeydown}>
    <input
        type="text"
        bind:this={searchInput}
        bind:value={search}
        placeholder="search icons..."
        class="search-input"
    />
    <div class="icon-grid">
        {#each suggestions as slug}
            <button
                class="icon-option"
                class:active={slug === icon || (!icon && slug === guessed)}
                title={slug}
                onclick={() => onselect(slug)}
            >
                <span class="si si-{slug}"></span>
            </button>
        {/each}
        {#if suggestions.length === 0}
            <span class="no-results">no icons found</span>
        {/if}
    </div>
    {#if icon}
        <button class="clear-btn" onclick={() => onselect('')}>
            <span class="bracket">[</span><span class="action-text"
                >clear icon</span
            ><span class="bracket">]</span>
        </button>
    {/if}
</div>

<style>
    .icon-picker {
        padding: 0.5rem 0;
    }
    .search-input {
        width: 100%;
        padding: 0.375rem 0.5rem;
        background: var(--bg-2);
        border: 2px solid var(--bg-3);
        margin-bottom: 0.5rem;
    }
    .search-input::placeholder {
        color: var(--txt-3);
    }
    .icon-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(2.5rem, 1fr));
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: var(--bg-3) var(--bg-2);
    }
    .icon-option {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--txt-2);
        border: 2px solid transparent;
        width: 2.5rem;
        height: 2.5rem;
    }
    .icon-option:hover {
        background: var(--bg-3);
        color: var(--txt-1);
    }
    .icon-option.active {
        border-color: var(--txt-3);
    }
    .no-results {
        color: var(--txt-3);
        padding: 0.5rem;
        grid-column: 1 / -1;
    }
    .clear-btn {
        margin-top: 0.5rem;
        font-size: 0.875rem;
    }
    .bracket {
        color: var(--txt-3);
    }
    .action-text {
        color: var(--txt-2);
    }
    .clear-btn:hover .bracket {
        color: var(--txt-2);
    }
</style>
