<script>
    import { onMount } from 'svelte'
    import QuotesAPI from '../api/quotes-api.js'

    let { class: className = '' } = $props()

    let quote = $state(null)
    let loading = $state(false)

    const quotesAPI = new QuotesAPI()

    async function loadQuote() {
        loading = true
        try {
            quote = await quotesAPI.getQuote()
        } catch (error) {
            console.error('failed to load quote:', error)
        } finally {
            loading = false
        }
    }

    function refreshQuote() {
        quotesAPI.clearCache()
        loadQuote()
    }

    onMount(() => {
        loadQuote()
    })
</script>

<div class="panel-wrapper {className}">
    <button class="widget-label" onclick={refreshQuote} disabled={loading}>
        {loading ? 'loading...' : 'quote'}
    </button>
    <div class="panel">
        {#if quote}
            <div class="quote-content">"{quote.content}"</div>
            <div class="quote-author">- {quote.author}</div>
        {:else if loading}
            <div class="quote-loading">loading...</div>
        {/if}
    </div>
</div>

<style>
    .panel-wrapper {
        flex-shrink: 0;
        width: 0;
        min-width: 100%;
    }
    .panel-wrapper.expand {
        flex-grow: 1;
    }
    .panel {
        overflow: hidden;
    }
    .quote-content {
        font-size: 1rem;
        color: var(--txt-2);
        line-height: 1.5;
        font-style: italic;
        margin-bottom: 0.5rem;
        word-wrap: break-word;
        overflow-wrap: break-word;
        white-space: normal;
    }
    .quote-author {
        font-size: 0.875rem;
        color: var(--txt-3);
    }
    .quote-loading {
        color: var(--txt-3);
    }
</style>
