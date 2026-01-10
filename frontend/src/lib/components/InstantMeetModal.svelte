<script lang="ts" module>
    import {
        hasMeetScope,
        signIn,
        refreshScopes,
    } from '../providers/google-auth/'
    import type GoogleCalendarProvider from '../providers/google-calendar-provider'

    let open = $state(false)
    let link = $state('')
    let creating = $state(false)
    let needsReauth = $state(false)
    let failed = $state(false)

    export async function createInstantMeet(
        provider: GoogleCalendarProvider
    ): Promise<void> {
        await refreshScopes()
        if (!hasMeetScope()) {
            needsReauth = true
            open = true
            return
        }

        creating = true
        failed = false
        link = ''
        needsReauth = false
        open = true

        try {
            link = await provider.createMeetLink()
        } catch (err) {
            console.error('Failed to create Meet link:', err)
            const message = err instanceof Error ? err.message : ''
            if (message.includes('403') || message.includes('insufficient')) {
                needsReauth = true
            } else {
                failed = true
            }
        } finally {
            creating = false
        }
    }

    function close(): void {
        open = false
        link = ''
        failed = false
        needsReauth = false
    }
</script>

<script lang="ts">
    import { Modal, Text, Button } from './ui'
    import CopyableLink from './CopyableLink.svelte'
</script>

<Modal {open} onClose={close}>
    {#if needsReauth}
        <Text color="secondary">
            Additional permissions required to create Meet links.
        </Text>
        <br /><br />
        <Button variant="primary" onclick={signIn}>
            Grant permissions
        </Button>
    {:else if creating}
        <Text color="secondary">Creating meeting...</Text>
    {:else if failed}
        <Text color="error">failed to create meeting</Text>
    {:else if link}
        <Text size="sm" color="muted">Your meeting link:</Text>
        <br /><br />
        <CopyableLink href={link} />
    {/if}
</Modal>
