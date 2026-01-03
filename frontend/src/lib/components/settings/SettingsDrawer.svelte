<script lang="ts">
    import type { Snippet, Component } from 'svelte'
    import { Drawer, Link } from '../ui'

    interface Tab {
        id: string
        icon: Component
        title: string
    }

    let {
        open = false,
        tabs,
        activeTab = $bindable(''),
        version = '',
        onClose,
        onReset,
        children,
    }: {
        open?: boolean
        tabs: Tab[]
        activeTab: string
        version?: string
        onClose?: () => void
        onReset?: () => void
        children: Snippet
    } = $props()
</script>

<Drawer {open} title="settings" {tabs} bind:activeTab {onClose}>
    {@render children()}

    {#snippet footer()}
        re-start
        <Link href="https://github.com/refact0r/re-start" target="_blank">
            {#if version}v{version}{/if}
        </Link>
        • made with love by
        <Link href="https://refact0r.dev" target="_blank">refact0r</Link>
        •
        <button onclick={onReset}>reset settings</button>
    {/snippet}
</Drawer>
