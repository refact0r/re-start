<script lang="ts">
    import { Copy, Check } from 'lucide-svelte'
    import { Box, Link, Text, Button } from './ui'

    let {
        href,
        label,
    }: {
        href: string
        label?: string
    } = $props()

    let copied = $state(false)

    async function copyLink(): Promise<void> {
        try {
            await navigator.clipboard.writeText(href)
            copied = true
            setTimeout(() => {
                copied = false
            }, 2000)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }
</script>

<Box padding="md" background="secondary" border rounded>
    <Text size="sm" color="primary" flex>
        <Link {href} target="_blank">{label || href}</Link>
    </Text>
    <Button variant="icon" onclick={copyLink} title="Copy link">
        {#if copied}
            <Check size={14} />
        {:else}
            <Copy size={14} />
        {/if}
    </Button>
</Box>
