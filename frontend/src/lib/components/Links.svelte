<script lang="ts">
    import { settings } from '../settings-store.svelte'
    import { Panel, Row, Column, Link, Favicon, Bullet } from './ui'
    import type { Link as LinkType } from '../types'

    const columns = $derived.by(() => {
        const result: LinkType[][] = []
        const linksPerColumn = Math.max(1, settings.linksPerColumn || 1)
        for (let i = 0; i < settings.links.length; i += linksPerColumn) {
            result.push(settings.links.slice(i, i + linksPerColumn))
        }
        return result
    })
</script>

<Panel label="links" span={3} noFade noPaddingBottom>
    <Row gap="none">
        {#each columns as column, columnIndex (columnIndex)}
            <Column flex={1}>
                {#each column as link, linkIndex (`${columnIndex}-${linkIndex}`)}
                    <Link href={link.url} target={settings.linkTarget}>
                        {#if settings.showFavicons && link.url}
                            <Favicon url={link.url} />
                        {:else}
                            <Bullet />
                        {/if}
                        {link.title}
                    </Link>
                    <br />
                {/each}
            </Column>
        {/each}
    </Row>
</Panel>
