<script lang="ts">
    import { settings } from '../../settings-store.svelte'
    import { themeNames, themes } from '../../themes'
    import type { UnsplashBackground } from '../../types'
    import {
        Checkbox,
        FormGroup,
        TextInput,
        TextArea,
        Button,
        InlineGroup,
        RangeSlider,
        Text,
        Row,
        Link,
        SectionTitle,
    } from '../ui'
    import ThemeGrid from './ThemeGrid.svelte'

    let {
        refreshBackground = null,
        background = null,
    }: {
        refreshBackground: (() => Promise<void>) | null
        background: UnsplashBackground | null
    } = $props()

    let refreshingBackground = $state(false)

    async function handleRefreshBackground(): Promise<void> {
        if (!refreshBackground) return
        try {
            refreshingBackground = true
            await refreshBackground()
        } catch (err) {
            console.error('Failed to refresh background:', err)
        } finally {
            refreshingBackground = false
        }
    }
</script>

<SectionTitle first>theme</SectionTitle>

<FormGroup label="color scheme">
    <ThemeGrid {themes} {themeNames} bind:selected={settings.currentTheme} />
</FormGroup>

<InlineGroup>
    <FormGroup label="font">
        <TextInput
            bind:value={settings.font}
            id="font"
            placeholder="Geist Mono Variable"
        />
    </FormGroup>
    <FormGroup label="tab title" autoWidth>
        <TextInput
            bind:value={settings.tabTitle}
            id="tab-title"
            placeholder="~"
        />
    </FormGroup>
</InlineGroup>

<SectionTitle>background image</SectionTitle>

<FormGroup>
    <Checkbox bind:checked={settings.showBackground}>enabled</Checkbox>
</FormGroup>

{#if settings.showBackground}
    {#if !settings.unsplashApiKey}
        <FormGroup>
            <Text color="muted">add unsplash api key in integrations tab</Text>
        </FormGroup>
    {:else}
        <FormGroup>
            <RangeSlider
                bind:value={settings.backgroundOpacity}
                id="bg-opacity"
                label="opacity"
                showValue
            />
        </FormGroup>

        <FormGroup>
            <Row align="center" gap="md">
                <Text size="sm" color="muted">
                    {#if background}
                        <Text color="secondary"
                            >{background.topic || 'random'}</Text
                        >
                        by
                        <Link
                            href={background.photographer?.profileUrl}
                            target="_blank"
                        >
                            {background.photographer?.name}
                        </Link>
                    {:else}
                        loading...
                    {/if}
                </Text>
                <Button
                    onclick={handleRefreshBackground}
                    disabled={refreshingBackground}
                >
                    {refreshingBackground ? '...' : 'new image'}
                </Button>
            </Row>
        </FormGroup>
    {/if}
{/if}

<SectionTitle>custom css</SectionTitle>

<FormGroup>
    <TextArea
        bind:value={settings.customCSS}
        id="custom-css"
        placeholder="/* add your custom styles here */"
        rows={6}
    />
</FormGroup>
