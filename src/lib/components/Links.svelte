<script>
    import { settings } from '../stores/settings-store.svelte.js'
    import { guessIconSlug, isValidSlug } from '../utils/link-icons.js'

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

    function getIconSlug(link) {
        if (link.icon && isValidSlug(link.icon)) return link.icon
        if (link.url) return guessIconSlug(link.url)
        return null
    }
</script>

<div class="panel-wrapper">
    <div class="panel-label">links</div>
    <div class="panel">
        {#each columns as column}
            <div class="column">
                {#each column as link}
                    {@const slug =
                        settings.showLinkIcons !== false
                            ? getIconSlug(link)
                            : null}
                    <a
                        href={link.url}
                        target={settings.linkTarget}
                        rel="noopener noreferrer"
                        class="link"
                    >
                        {#if slug}
                            <span class="icon si si-{slug}"></span>
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
        gap: 1.5rem;
    }
    .link:hover .prefix,
    .link:hover .icon {
        color: var(--txt-2);
    }
    .prefix,
    .icon {
        display: inline-block;
        width: 1.25rem;
        color: var(--txt-3);
        text-align: center;
    }
    .icon {
        font-size: 0.875rem;
        vertical-align: text-bottom;
    }
    .column {
        flex-grow: 1;
    }
</style>
