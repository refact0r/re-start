<script>
    import { fade, fly } from 'svelte/transition'
    import {
        saveSettings,
        settings,
        resetSettings,
    } from '../settings-store.svelte.js'
    import { themeNames, themes } from '../themes.js'
    import RadioButton from './RadioButton.svelte'

    let { showSettings = false, closeSettings } = $props()

    // @ts-ignore
    const version = __APP_VERSION__

    function addLink() {
        settings.links = [...settings.links, { title: '', url: '' }]
    }

    function removeLink(index) {
        settings.links = settings.links.filter((_, i) => i !== index)
    }

    function handleClose() {
        saveSettings(settings)
        closeSettings()
    }

    function handleKeydown(event) {
        if (event.key === 'Escape') {
            handleClose()
        }
    }

    function handleReset() {
        if (
            confirm('are you sure you want to reset all settings to default?')
        ) {
            resetSettings()
            saveSettings(settings)
        }
    }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if showSettings}
    <div
        class="backdrop"
        onclick={handleClose}
        onkeydown={(e) => e.key === 'Enter' && handleClose()}
        role="button"
        tabindex="0"
        transition:fade={{ duration: 200 }}
    ></div>

    <div class="settings" transition:fly={{ x: 640, duration: 200 }}>
        <div class="header">
            <h2>settings</h2>
            <button class="close-btn" onclick={handleClose}>×</button>
        </div>

        <div class="content">
            <div class="group">
                <div class="setting-label">theme</div>
                <div class="theme-grid">
                    {#each themeNames as themeName}
                        <div class="theme-option">
                            <RadioButton
                                bind:group={settings.currentTheme}
                                value={themeName}
                            >
                                <div class="theme-preview">
                                    <div
                                        style="background-color: {themes[
                                            themeName
                                        ].colors['--bg-1']}"
                                    ></div>
                                    <div
                                        style="background-color: {themes[
                                            themeName
                                        ].colors['--txt-4']}"
                                    ></div>
                                    <div
                                        style="background-color: {themes[
                                            themeName
                                        ].colors['--txt-2']}"
                                    ></div>
                                </div>
                                <span class="theme-name"
                                    >{themes[themeName].displayName}</span
                                >
                            </RadioButton>
                        </div>
                    {/each}
                </div>
            </div>
            <div class="group">
                <label for="font">font</label>
                <input
                    id="font"
                    type="text"
                    bind:value={settings.font}
                    placeholder="Geist Mono Variable"
                />
            </div>

            <div class="group">
                <label for="tab-title">tab title</label>
                <input
                    id="tab-title"
                    type="text"
                    bind:value={settings.tabTitle}
                    placeholder="~"
                />
            </div>

            <div class="group">
                <div class="setting-label">task backend</div>
                <div class="radio-group">
                    <RadioButton
                        bind:group={settings.taskBackend}
                        value="local"
                    >
                        local
                    </RadioButton>
                    <RadioButton
                        bind:group={settings.taskBackend}
                        value="todoist"
                    >
                        todoist
                    </RadioButton>
                </div>
            </div>

            {#if settings.taskBackend === 'todoist'}
                <div class="group">
                    <label for="todoist-token">todoist api token</label>
                    <input
                        id="todoist-token"
                        type="password"
                        bind:value={settings.todoistApiToken}
                    />
                </div>
            {/if}
            <div class="group">
                <label for="latitude">weather latitude</label>
                <input
                    id="latitude"
                    type="number"
                    bind:value={settings.latitude}
                    step="0.01"
                />
            </div>
            <div class="group">
                <label for="longitude">weather longitude</label>
                <input
                    id="longitude"
                    type="number"
                    bind:value={settings.longitude}
                    step="0.01"
                />
            </div>

            <div class="group">
                <div class="setting-label">time format</div>
                <div class="radio-group">
                    <RadioButton bind:group={settings.timeFormat} value="12hr">
                        12 hour
                    </RadioButton>
                    <RadioButton bind:group={settings.timeFormat} value="24hr">
                        24 hour
                    </RadioButton>
                </div>
            </div>
            <div class="group">
                <div class="setting-label">date format</div>
                <div class="radio-group">
                    <RadioButton bind:group={settings.dateFormat} value="mdy">
                        month-day-year
                    </RadioButton>
                    <RadioButton bind:group={settings.dateFormat} value="dmy">
                        day-month-year
                    </RadioButton>
                </div>
            </div>
            <div class="group">
                <div class="setting-label">temperature format</div>
                <div class="radio-group">
                    <RadioButton
                        bind:group={settings.tempUnit}
                        value="fahrenheit"
                    >
                        fahrenheit
                    </RadioButton>
                    <RadioButton bind:group={settings.tempUnit} value="celsius">
                        celsius
                    </RadioButton>
                </div>
            </div>
            <div class="group">
                <div class="setting-label">speed format</div>
                <div class="radio-group">
                    <RadioButton bind:group={settings.speedUnit} value="mph">
                        mph
                    </RadioButton>
                    <RadioButton bind:group={settings.speedUnit} value="kmh">
                        kmh
                    </RadioButton>
                </div>
            </div>
            <div class="group">
                <div class="setting-label">link behavior</div>
                <div class="radio-group">
                    <RadioButton bind:group={settings.linkTarget} value="_self">
                        same tab
                    </RadioButton>
                    <RadioButton
                        bind:group={settings.linkTarget}
                        value="_blank"
                    >
                        new tab
                    </RadioButton>
                </div>
            </div>
            <div class="group">
                <label for="linksPerColumn">links per column</label>
                <input
                    id="linksPerColumn"
                    type="number"
                    bind:value={settings.linksPerColumn}
                    step="1"
                />
            </div>
            <div class="group">
                <div class="links-header">
                    <div class="setting-label">links</div>
                    <button class="add-btn" onclick={addLink}>add link</button>
                </div>
                <div class="links-list">
                    {#each settings.links as link, index}
                        <div class="link">
                            <input
                                type="text"
                                bind:value={link.title}
                                placeholder="title"
                                class="link-input name"
                            />
                            <input
                                type="url"
                                bind:value={link.url}
                                placeholder="https://example.com"
                                class="link-input"
                            />
                            <button
                                class="remove-btn"
                                onclick={() => removeLink(index)}
                            >
                                ×
                            </button>
                        </div>
                    {/each}
                </div>
            </div>
            <div class="group">
                <label for="custom-css">custom css</label>
                <textarea
                    id="custom-css"
                    bind:value={settings.customCSS}
                    placeholder="/* add your custom styles here */"
                    rows="6"
                ></textarea>
            </div>
            <div class="version">
                <a href="https://github.com/refact0r/re-start" target="_blank">
                    re-start
                    {#if version}v{version}
                    {/if}</a
                >
                • made with ❤️ by
                <a href="https://refact0r.dev" target="_blank">refact0r</a>
                •
                <button class="reset-link" onclick={handleReset}
                    >reset settings</button
                >
            </div>
        </div>
    </div>
{/if}

<style>
    .backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 999;
    }
    .settings {
        position: fixed;
        top: 0;
        right: 0;
        width: 40rem;
        height: 100%;
        background: var(--bg-1);
        border-left: 2px solid var(--bg-3);
        z-index: 1000;
        display: flex;
        flex-direction: column;
    }
    .header {
        padding: 0.75rem 1rem 0.75rem 1.5rem;
        border-bottom: 2px solid var(--bg-3);
        display: flex;
        justify-content: space-between;
        align-items: center;

        h2 {
            margin: 0;
        }
    }
    .close-btn {
        padding: 0 0.5rem;
        font-size: 1.75rem;
        line-height: 2.25rem;
        font-weight: 300;
    }
    .content {
        flex: 1;
        padding: 1.5rem;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: var(--bg-3) var(--bg-1);
    }
    .group {
        margin-bottom: 1.5rem;
    }
    .group > label,
    .setting-label {
        display: block;
        margin-bottom: 0.5rem;
    }
    .group input[type='text'],
    .group input[type='password'],
    .group input[type='number'],
    .group input[type='url'] {
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
    .links-header {
        display: flex;
        justify-content: space-between;
    }
    .add-btn {
        height: 1.5rem;
    }
    .link {
        display: flex;
        margin-bottom: 0.5rem;
    }
    .link-input.name {
        width: 12rem;
        margin-right: 0.5rem;
    }
    .remove-btn {
        padding-left: 0.5rem;
        font-size: 1.5rem;
        font-weight: 300;
    }
    .version {
        color: var(--txt-3);

        a {
            color: var(--txt-2);
        }
        a:hover {
            color: var(--txt-1);
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
    .radio-group {
        display: flex;
        gap: 3ch;
    }
    .reset-link {
        background: none;
        border: none;
        color: var(--txt-2);
        cursor: pointer;
        padding: 0;
        font-size: inherit;
        font-family: inherit;
    }
    .reset-link:hover {
        color: var(--txt-1);
    }
</style>
