<script lang="ts">
    import { onMount } from 'svelte'
    import { settings } from '../settings-store.svelte.js'

    let search_value: string

    let error = false
    let temp = ''

    export function search_startpage() {
        if (settings.engineTarget == '') {
            console.error('invalid search engine')
            error = true
            temp = search_value
            search_value = 'invalid search engine'
            setTimeout(() => {
                error = false

                search_value = temp
                temp = ''
            }, 3 * 1000)
            return
        }
        const eng = settings.engines.find(
            (e) => e.title == settings.engineTarget
        ).url

        const url = `${eng}${encodeURIComponent(search_value)}`
        window.location.href = url
    }

    onMount(() => {
        document.addEventListener('keydown', (event) => {
            if (event.code == 'Enter') {
                search_startpage()
            }
        })
    })
</script>

<div class="panel-wrapper search-wrapper">
    <span class="widget-label">search</span>
    <div class="panel">
        <input
            type="text"
            class="search"
            class:error
            bind:value={search_value}
            placeholder="knowledge unfits a man to be a slave..."
            disabled={error}
        />
    </div>
</div>

<style>
    .error {
        color: var(--txt-err);
    }

    .search-wrapper {
        border-color: var(--txt-3);
        width: 100%;
    }

    .search {
        padding-left: 20px;
        background-color: var(--bg-1);
        position: absolute;
        border: 2px solid var(--bg-3);
        height: 100%;
        inset: 0;
    }
</style>
