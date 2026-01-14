<script>
    import { fade, fly } from 'svelte/transition'
    import {
        saveSettings,
        settings,
        resetSettings,
    } from '../stores/settings-store.svelte.js'
    import { themeNames, themes } from '../config/themes.js'
    import RadioButton from './ui/RadioButton.svelte'
    import Checkbox from './ui/Checkbox.svelte'
    import { createTaskBackend } from '../backends/index.js'
    import { isChrome } from '../utils/browser-detect.js'

    let { showSettings = false, closeSettings } = $props()

    // Check if Google Tasks is available (Chrome only)
    const googleTasksAvailable = isChrome()

    // @ts-ignore
    const version = __APP_VERSION__

    let googleTasksApi = $state(null)
    let signingIn = $state(false)
    let signInError = $state('')

    async function handleGoogleSignIn() {
        try {
            signingIn = true
            signInError = ''

            if (!googleTasksApi) {
                googleTasksApi = createTaskBackend('google-tasks')
            }

            await googleTasksApi.signIn()
            settings.googleTasksSignedIn = true
            saveSettings(settings)
        } catch (err) {
            console.error('google sign in failed:', err)
            signInError = 'sign in failed'
            settings.googleTasksSignedIn = false
        } finally {
            signingIn = false
        }
    }

    async function handleGoogleSignOut() {
        try {
            if (!googleTasksApi) {
                googleTasksApi = createTaskBackend('google-tasks')
            }

            await googleTasksApi.signOut()
            settings.googleTasksSignedIn = false
            saveSettings(settings)
            signInError = ''
        } catch (err) {
            console.error('google sign out failed:', err)
        }
    }

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

    // Drag and drop state
    let draggedIndex = $state(null)
    let dropSlotIndex = $state(null) // Which slot (between items) to drop into

    function handleDragStart(event, index) {
        draggedIndex = index
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/html', event.currentTarget)
    }

    function handleDropZoneDragOver(event, slotIndex) {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        dropSlotIndex = slotIndex
    }

    function handleDropZoneDragLeave() {
        dropSlotIndex = null
    }

    function handleDropZoneDrop(event, slotIndex) {
        event.preventDefault()

        if (draggedIndex === null) {
            dropSlotIndex = null
            return
        }

        // Don't do anything if dropping in the same position
        if (slotIndex === draggedIndex || slotIndex === draggedIndex + 1) {
            draggedIndex = null
            dropSlotIndex = null
            return
        }

        const newLinks = [...settings.links]
        const draggedItem = newLinks[draggedIndex]

        // Remove the dragged item
        newLinks.splice(draggedIndex, 1)

        // Adjust slot index if we removed an item before it
        const adjustedSlotIndex =
            draggedIndex < slotIndex ? slotIndex - 1 : slotIndex

        // Insert at the slot position
        newLinks.splice(adjustedSlotIndex, 0, draggedItem)

        settings.links = newLinks
        draggedIndex = null
        dropSlotIndex = null
    }

    function handleDragEnd() {
        draggedIndex = null
        dropSlotIndex = null
    }

    let locationLoading = $state(false)
    let locationError = $state(null)

    async function useCurrentLocation() {
        if (!navigator.geolocation) {
            locationError = 'geolocation not supported by browser'
            setTimeout(() => (locationError = null), 3000)
            return
        }

        locationLoading = true
        locationError = null

        navigator.geolocation.getCurrentPosition(
            (position) => {
                settings.latitude =
                    Math.round(position.coords.latitude * 100) / 100
                settings.longitude =
                    Math.round(position.coords.longitude * 100) / 100
                locationLoading = false
            },
            (error) => {
                locationLoading = false
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        locationError = 'location permission denied'
                        break
                    case error.POSITION_UNAVAILABLE:
                        locationError = 'location unavailable'
                        break
                    case error.TIMEOUT:
                        locationError = 'location request timed out'
                        break
                    default:
                        locationError = 'failed to get location'
                }
                setTimeout(() => (locationError = null), 3000)
            },
            {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 300000,
            }
        )
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
            <button class="close-btn" onclick={handleClose}>x</button>
        </div>

        <div class="content">
            <div class="group">
                <div class="setting-label">widgets</div>
                <div class="checkbox-group">
                    <Checkbox bind:checked={settings.showClock}>clock</Checkbox>
                    <Checkbox bind:checked={settings.showStats}>stats</Checkbox>
                    <Checkbox bind:checked={settings.showWeather}>
                        weather
                    </Checkbox>
                    <Checkbox bind:checked={settings.showTasks}>tasks</Checkbox>
                    <Checkbox bind:checked={settings.showLinks}>links</Checkbox>
                </div>
            </div>
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
                                        ].preview.bg}"
                                    ></div>
                                    <div
                                        style="background-color: {themes[
                                            themeName
                                        ].preview.accent}"
                                    ></div>
                                    <div
                                        style="background-color: {themes[
                                            themeName
                                        ].preview.text}"
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
                    {#if googleTasksAvailable}
                        <RadioButton
                            bind:group={settings.taskBackend}
                            value="google-tasks"
                        >
                            google tasks
                        </RadioButton>
                    {/if}
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

            {#if settings.taskBackend === 'google-tasks'}
                <div class="group">
                    <div class="setting-label">google tasks authentication</div>
                    <button
                        class="button"
                        onclick={settings.googleTasksSignedIn
                            ? handleGoogleSignOut
                            : handleGoogleSignIn}
                        disabled={signingIn}
                    >
                        [{settings.googleTasksSignedIn
                            ? 'sign out'
                            : signInError
                              ? signInError
                              : signingIn
                                ? 'signing in...'
                                : 'sign in with google'}]
                    </button>
                </div>
            {/if}

            <div class="group">
                <div class="setting-label">weather forecast</div>
                <div class="radio-group">
                    <RadioButton
                        bind:group={settings.forecastMode}
                        value="hourly"
                    >
                        hourly
                    </RadioButton>
                    <RadioButton
                        bind:group={settings.forecastMode}
                        value="daily"
                    >
                        daily
                    </RadioButton>
                </div>
            </div>
            <div class="group">
                <div class="setting-label">weather location</div>
                <div class="radio-group">
                    <RadioButton
                        bind:group={settings.locationMode}
                        value="manual"
                    >
                        manual
                    </RadioButton>
                    <RadioButton
                        bind:group={settings.locationMode}
                        value="auto"
                    >
                        auto
                    </RadioButton>
                </div>
            </div>

            {#if settings.locationMode === 'manual'}
                <div class="supergroup short">
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
                </div>
                <div class="group">
                    <button
                        class="button"
                        onclick={useCurrentLocation}
                        disabled={locationLoading}
                    >
                        [{locationError
                            ? locationError
                            : locationLoading
                              ? 'getting location...'
                              : 'use current location'}]
                    </button>
                </div>
            {/if}

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
                        <!-- Drop zone before this item -->
                        <div
                            class="drop-zone"
                            class:active={dropSlotIndex === index}
                            ondragover={(e) => handleDropZoneDragOver(e, index)}
                            ondragleave={handleDropZoneDragLeave}
                            ondrop={(e) => handleDropZoneDrop(e, index)}
                            role="none"
                        ></div>

                        <div
                            class="link"
                            class:dragging={draggedIndex === index}
                            role="listitem"
                        >
                            <span
                                class="drag-handle"
                                title="Drag to reorder"
                                draggable="true"
                                ondragstart={(e) => handleDragStart(e, index)}
                                ondragend={handleDragEnd}
                                role="button"
                                tabindex="0">=</span
                            >
                            <input
                                type="text"
                                bind:value={link.title}
                                placeholder="title"
                                class="link-input name"
                                draggable="false"
                            />
                            <input
                                type="url"
                                bind:value={link.url}
                                placeholder="https://example.com"
                                class="link-input"
                                draggable="false"
                            />
                            <button
                                class="remove-btn"
                                onclick={() => removeLink(index)}
                            >
                                x
                            </button>
                        </div>
                    {/each}

                    <!-- Drop zone after the last item -->
                    <div
                        class="drop-zone"
                        class:active={dropSlotIndex === settings.links.length}
                        ondragover={(e) =>
                            handleDropZoneDragOver(e, settings.links.length)}
                        ondragleave={handleDropZoneDragLeave}
                        ondrop={(e) =>
                            handleDropZoneDrop(e, settings.links.length)}
                        role="none"
                    ></div>
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
                re-start
                <a href="https://github.com/refact0r/re-start" target="_blank">
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
        font-size: 1.5rem;
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
    .supergroup {
        display: flex;
        gap: 1rem;

        &.short .group {
            margin-bottom: 1rem;
        }
    }
    .group {
        flex: 1;
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
    .drop-zone {
        height: 0.25rem;
        margin: 0;
        position: relative;
    }
    .drop-zone.active::before {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        top: 50%;
        transform: translateY(-50%);
        height: 2px;
        background-color: var(--txt-2);
    }
    .link {
        display: flex;
        align-items: center;
        margin-bottom: 0;
        border: 2px solid transparent;
    }
    .link.dragging {
        opacity: 0.5;
    }
    .drag-handle {
        cursor: grab;
        padding: 0 0.5rem 0 0.25rem;
        color: var(--txt-3);
        user-select: none;
        font-size: 1.125rem;
        touch-action: none;
    }
    .drag-handle:active {
        cursor: grabbing;
    }
    .link .link-input.name {
        width: 10rem;
        margin-right: 0.5rem;
    }
    .remove-btn {
        padding: 0 0.25rem 0 0.5rem;
        font-size: 1.125rem;
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
    .radio-group,
    .checkbox-group {
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
