<script>
    import { settings } from '../../settings-store.svelte.js'
    import { themeNames, themes } from '../../themes.js'
    import RadioButton from '../RadioButton.svelte'

    let { refreshBackground = null, background = null } = $props()

    let refreshingBackground = $state(false)

    async function handleRefreshBackground() {
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

<h3 class="section-title first">theme</h3>

<div class="group">
    <div class="setting-label">color scheme</div>
    <div class="theme-grid">
        {#each themeNames as themeName}
            <div class="theme-option">
                <RadioButton
                    bind:group={settings.currentTheme}
                    value={themeName}
                >
                    <div class="theme-preview">
                        <div
                            style="background-color: {themes[themeName].colors['--bg-1']}"
                        ></div>
                        <div
                            style="background-color: {themes[themeName].colors['--txt-4']}"
                        ></div>
                        <div
                            style="background-color: {themes[themeName].colors['--txt-2']}"
                        ></div>
                    </div>
                    <span class="theme-name">{themes[themeName].displayName}</span>
                </RadioButton>
            </div>
        {/each}
    </div>
</div>

<div class="inline-group">
    <div class="group">
        <label for="font">font</label>
        <input
            id="font"
            type="text"
            bind:value={settings.font}
            placeholder="Geist Mono Variable"
        />
    </div>
    <div class="group small">
        <label for="tab-title">tab title</label>
        <input
            id="tab-title"
            type="text"
            bind:value={settings.tabTitle}
            placeholder="~"
        />
    </div>
</div>

<h3 class="section-title">background image</h3>

<div class="group">
    <button class="checkbox-label" onclick={() => settings.showBackground = !settings.showBackground}>
        <span class="checkbox">{settings.showBackground ? '[x]' : '[ ]'}</span>
        enabled
    </button>
</div>

{#if settings.showBackground}
    {#if !settings.unsplashApiKey}
        <div class="group">
            <div class="warning">add unsplash api key in integrations tab</div>
        </div>
    {:else}
        <div class="group">
            <label for="bg-opacity">opacity: {Math.round(settings.backgroundOpacity * 100)}%</label>
            <input
                id="bg-opacity"
                type="range"
                min="0"
                max="1"
                step="0.01"
                bind:value={settings.backgroundOpacity}
            />
        </div>

        <div class="group">
            <div class="background-info">
                {#if background}
                    <span class="bg-topic">{background.topic || 'random'}</span>
                    <span class="bg-photographer">
                        by <a href={background.photographer?.profileUrl} target="_blank" rel="noopener noreferrer">{background.photographer?.name}</a>
                    </span>
                {:else}
                    <span class="bg-loading">loading...</span>
                {/if}
                <button
                    class="button"
                    onclick={handleRefreshBackground}
                    disabled={refreshingBackground}
                >
                    [{refreshingBackground ? '...' : 'new image'}]
                </button>
            </div>
        </div>
    {/if}
{/if}

<h3 class="section-title">custom css</h3>

<div class="group">
    <textarea
        id="custom-css"
        bind:value={settings.customCSS}
        placeholder="/* add your custom styles here */"
        rows="6"
    ></textarea>
</div>

<style>
    .section-title {
        margin: 2rem 0 1rem 0;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid var(--bg-3);
        color: var(--txt-2);
        font-size: 0.875rem;
        font-weight: normal;
        text-transform: uppercase;
        letter-spacing: 0.1em;
    }
    .section-title.first {
        margin-top: 0;
    }
    .group {
        width: 100%;
        margin-bottom: 1.5rem;
    }
    .group > label,
    .setting-label {
        display: block;
        margin-bottom: 0.5rem;
    }
    .group input[type='text'] {
        width: 100%;
        padding: 0.5rem;
        background: var(--bg-2);
        border: 2px solid var(--bg-3);
    }
    .group textarea {
        width: 100%;
        padding: 0.5rem;
        background: var(--bg-2);
        border: 2px solid var(--bg-3);
        resize: vertical;
        font-family: var(--font-family);
        font-size: 0.875rem;
        min-height: 6rem;
        color: inherit;

        &:focus {
            outline: none;
        }
        &::placeholder {
            color: var(--txt-3);
        }
    }
    .theme-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
    }
    .theme-preview {
        display: inline-flex;
        vertical-align: middle;
        margin-top: -0.125rem;
        border: 2px solid var(--bg-3);
    }
    .theme-preview div {
        width: 1rem;
        height: 1rem;
    }
    .theme-name {
        font-size: 0.9rem;
        flex: 1;
    }
    .inline-group {
        display: flex;
        gap: 1rem;
        margin-bottom: 1.5rem;
    }
    .inline-group .group {
        flex: 1;
        margin-bottom: 0;
    }
    .inline-group .group.small {
        flex: 0 0 8rem;
    }
    .checkbox-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        background: none;
        border: none;
        padding: 0;
        font: inherit;
        color: inherit;
        text-align: left;
    }
    .checkbox-label .checkbox {
        color: var(--txt-2);
    }
    input[type='range'] {
        width: 100%;
        height: 0.5rem;
        appearance: none;
        background: var(--bg-3);
        border-radius: 0;
        cursor: pointer;
    }
    input[type='range']::-webkit-slider-thumb {
        appearance: none;
        width: 1rem;
        height: 1rem;
        background: var(--txt-2);
        border: none;
        cursor: pointer;
    }
    input[type='range']::-moz-range-thumb {
        width: 1rem;
        height: 1rem;
        background: var(--txt-2);
        border: none;
        cursor: pointer;
    }
    .background-info {
        display: flex;
        align-items: center;
        gap: 1rem;
        color: var(--txt-3);
        font-size: 0.875rem;
    }
    .bg-topic {
        color: var(--txt-2);
    }
    .bg-photographer a {
        color: var(--txt-2);
    }
    .bg-photographer a:hover {
        color: var(--txt-1);
    }
    .bg-loading {
        color: var(--txt-3);
    }
    .warning {
        color: var(--txt-3);
        font-size: 0.875rem;
    }
</style>
