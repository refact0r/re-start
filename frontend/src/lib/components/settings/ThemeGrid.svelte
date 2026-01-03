<script lang="ts">
    import { RadioButton, GridGroup, ColorSwatch, Text } from '../ui'
    import type { Theme } from '../../types'

    let {
        themes,
        themeNames,
        selected = $bindable(),
    }: {
        themes: Record<string, Theme>
        themeNames: string[]
        selected: string
    } = $props()
</script>

<GridGroup columns={2} gap="sm" noMargin>
    {#each themeNames as themeName (themeName)}
        <RadioButton bind:group={selected} value={themeName}>
            <ColorSwatch
                colors={[
                    themes[themeName].colors['--bg-1'],
                    themes[themeName].colors['--txt-4'],
                    themes[themeName].colors['--txt-2'],
                ]}
            />
            <Text size="sm" flex>{themes[themeName].displayName}</Text>
        </RadioButton>
    {/each}
</GridGroup>
