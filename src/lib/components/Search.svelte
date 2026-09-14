<script>
    import { settings } from '../stores/settings-store.svelte.js'

    let query = $state('')
    let inputEl = $state(null)

    const engines = $derived(settings.searchEngines)

    function cycleEngine() {
        const i = engines.findIndex((e) => e.name === settings.searchEngine)
        settings.searchEngine = engines[(i + 1) % engines.length].name
    }

    function doSearch() {
        const engine =
            engines.find((e) => e.name === settings.searchEngine) || engines[0]
        const url = engine.url + encodeURIComponent(query.trim())
        if (settings.linkTarget === '_blank') {
            window.open(url, '_blank', 'noopener,noreferrer')
        } else {
            window.location.assign(url)
        }
    }
</script>

<div class="panel-wrapper">
    <button class="panel-label" onclick={cycleEngine} title="click to change search engine">
        {engines.find((e) => e.name === settings.searchEngine)?.label ?? 'search'}
    </button>
    <div class="panel">
        <input
            bind:this={inputEl}
            bind:value={query}
            class="search-input"
            type="search"
            placeholder="search..."
            onkeydown={(e) => {
                if (e.key === 'Enter') doSearch()
                if (e.key === 'Escape') inputEl?.blur()
            }}
        />
    </div>
</div>

<style>
    .panel {
        display: flex;
        align-items: center;
    }
    .search-input {
        width: 100%;
        background: none;
        border: none;
        color: var(--txt-1);
        caret-color: var(--txt-2);
    }
    .search-input::placeholder {
        color: var(--txt-4);
    }
</style>