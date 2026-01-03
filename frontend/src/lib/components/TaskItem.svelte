<script lang="ts">
    import { ListItem, Text, Button } from './ui'

    let {
        checked = false,
        project,
        content,
        due,
        overdue = false,
        onToggle,
        onDelete,
    }: {
        checked?: boolean
        project?: string | null
        content: string
        due?: string | null
        overdue?: boolean
        onToggle?: () => void
        onDelete?: () => void
    } = $props()
</script>

<ListItem completed={checked}>
    <Button variant="checkbox" {checked} onclick={onToggle} />
    {#if project && project !== 'Inbox'}
        <Text color="muted">#{project}</Text>
    {/if}
    <Text flex content>{content || '(no content)'}</Text>
    {#if due}
        <Text color={overdue ? 'error' : 'muted'}>{due}</Text>
    {/if}
    <Button variant="delete" onclick={onDelete} title="delete">x</Button>
</ListItem>
