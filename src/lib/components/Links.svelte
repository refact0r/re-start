<script>
    import { settings } from '../settings-store.svelte.js'

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
</script>

<div class="links">
    {#each columns as column}
        <div class="column">
            {#each column as link}
                <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="link"
                >
                    <span>></span>
                    {link.title}
                </a>
                <br />
            {/each}
        </div>
    {/each}
</div>

<style>
    .links {
        display: flex;
        gap: 3rem;
        flex-wrap: wrap;
    }
    .link {
        text-decoration: none;
    }
    .link:hover span {
        color: var(--txt-2);
    }
    span {
        color: var(--txt-3);
    }
</style>
