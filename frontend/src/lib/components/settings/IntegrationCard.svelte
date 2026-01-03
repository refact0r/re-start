<script lang="ts">
    import type { Snippet } from 'svelte'
    import { Box, Column, Row, Text } from '../ui'

    let {
        name,
        description,
        email = '',
        stacked = false,
        children,
    }: {
        name: string
        description: string
        email?: string
        stacked?: boolean
        children: Snippet
    } = $props()
</script>

<Box padding="lg" background="secondary" border justify="between" marginBottom>
    <Column gap="none">
        <Text>{name}</Text>
        <Text size="sm" color="muted">{description}</Text>
        {#if email}
            <Text size="sm" color="secondary">{email}</Text>
        {/if}
    </Column>
    {#if stacked}
        <Column gap="xs" align="end">
            {@render children()}
        </Column>
    {:else}
        <Row gap="sm">
            {@render children()}
        </Row>
    {/if}
</Box>
