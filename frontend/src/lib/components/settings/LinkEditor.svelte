<script lang="ts">
    import type { Link } from '../../types'
    import { DraggableList, TextInput, Button, Row } from '../ui'

    let {
        links = $bindable(),
    }: {
        links: Link[]
    } = $props()

    // DraggableList requires items with id property
    let itemsWithId = $derived(links.map((link, i) => ({ ...link, id: i })))

    function addLink(): void {
        links = [...links, { title: '', url: '' }]
    }

    // Sync changes from itemsWithId back to links
    function _handleItemsChange(newItems: Array<Link & { id: number }>): void {
        links = newItems.map(({ title, url }) => ({ title, url }))
    }

    $effect(() => {
        // When itemsWithId changes due to drag/drop, sync back
        const newLinks = itemsWithId.map(({ title, url }) => ({ title, url }))
        if (JSON.stringify(newLinks) !== JSON.stringify(links)) {
            links = newLinks
        }
    })
</script>

<DraggableList items={itemsWithId} label="edit links" onAdd={addLink}>
    {#snippet itemContent(_item, index, removeItem)}
        <Row gap="sm" flex={1}>
            <TextInput
                bind:value={links[index].title}
                placeholder="title"
                width="md"
            />
            <TextInput
                bind:value={links[index].url}
                placeholder="https://example.com"
                type="url"
            />
            <Button
                variant="delete"
                onclick={() => removeItem(index)}
                title="remove">x</Button
            >
        </Row>
    {/snippet}
</DraggableList>
