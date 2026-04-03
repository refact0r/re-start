<script>
    import { onDestroy, tick } from 'svelte'
    import { fade, fly } from 'svelte/transition'
    import {
        saveSettings,
        settings,
        resetSettings,
    } from '../stores/settings-store.svelte.js'
    import {
        themeNames,
        themes,
        defaultCustomColors,
    } from '../config/themes.js'
    import RadioButton from './ui/RadioButton.svelte'
    import Checkbox from './ui/Checkbox.svelte'
    import { createTaskBackend } from '../backends/index.js'
    import { isChrome } from '../utils/browser-detect.js'
    import { guessIconSlug, isValidSlug, extractDomain } from '../utils/link-icons.js'
    import IconPicker from './IconPicker.svelte'

    let { showSettings = false, closeSettings } = $props()
    const prevDomains = new WeakMap()

    // Check if Google Tasks is available (Chrome only)
    const googleTasksAvailable = isChrome()

    // @ts-ignore
    const version = __APP_VERSION__

    let googleTasksApi = $state(null)
    let signingIn = $state(false)
    let signInError = $state('')

    function googleSignInLabel() {
        if (settings.googleTasksSignedIn) return 'sign out'
        if (signInError) return signInError
        if (signingIn) return 'signing in...'
        return 'sign in with google'
    }

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

    let iconPickerOpen = $state(null)
    let iconPickerRef = $state(null)

    function toggleIconPicker(index) {
        if (iconPickerOpen === index) {
            iconPickerOpen = null
        } else {
            iconPickerOpen = index
            tick().then(() => iconPickerRef?.focusInput())
        }
    }

    function initPrevDomain(link) {
        if (!prevDomains.has(link)) {
            prevDomains.set(link, extractDomain(link.url))
        }
    }

    function handleUrlChange(link) {
        const oldDomain = prevDomains.get(link) ?? ''
        const newDomain = extractDomain(link.url)
        if (oldDomain !== newDomain) {
            link.icon = guessIconSlug(link.url) || ''
            prevDomains.set(link, newDomain)
        }
    }

    function addLink() {
        settings.links = [...settings.links, { title: '', url: '', icon: '', hotkey: '' }]
    }

    function removeLink(index) {
        settings.links = settings.links.filter((_, i) => i !== index)
    }

    function handleClose() {
        saveSettings(settings)
        closeSettings()
    }

    function handleKeydown(event) {
        if (!showSettings) return

        if (event.defaultPrevented) return

        const target = event.target
        const isTypingField =
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable

        if (isTypingField) return

        if (event.key === 'Escape') {
            handleClose()
            return
        }
        const key = event.key
        const link = settings.links.find((l) => l.hotkey === key)
        if (link && link.url) {
            event.preventDefault()
            event.stopPropagation()
            const target = settings.linkTarget || '_self'
            if (target === '_blank') {
                window.open(link.url, target, 'noopener,noreferrer')
            } else {
                window.open(link.url, target)
            }
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

    function handleExport() {
        const dataStr = JSON.stringify(settings, null, 2)
        const blob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 're-start-settings.json'
        a.click()
        URL.revokeObjectURL(url)
    }

    let fileInput = $state(null)

    function handleImport() {
        fileInput?.click()
    }

    function handleFileSelect(event) {
        const file = event.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result)
                Object.assign(settings, imported)
                saveSettings(settings)
            } catch (err) {
                alert('failed to import settings: invalid json file')
            }
        }
        reader.readAsText(file)
        event.target.value = ''
    }

    function setCustomColor(key, value) {
        settings.customThemeColors = {
            ...settings.customThemeColors,
            [key]: value,
        }
    }

    const customColorLabels = [
        { key: 'bg1', label: 'bg 1' },
        { key: 'bg2', label: 'bg 2' },
        { key: 'bg3', label: 'bg 3' },
        { key: 'txt4', label: 'label' },
        { key: 'txt3', label: 'txt 3' },
        { key: 'txt2', label: 'txt 2' },
        { key: 'txt1', label: 'txt 1' },
        { key: 'txtErr', label: 'error' },
    ]

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
    let locationErrorTimeout = null

    async function useCurrentLocation() {
        if (!navigator.geolocation) {
            locationError = 'geolocation not supported by browser'
            if (locationErrorTimeout) clearTimeout(locationErrorTimeout)
            locationErrorTimeout = setTimeout(
                () => (locationError = null),
                3000
            )
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
                if (locationErrorTimeout) clearTimeout(locationErrorTimeout)
                locationErrorTimeout = setTimeout(
                    () => (locationError = null),
                    3000
                )
            },
            {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 300000,
            }
        )
    }

    onDestroy(() => {
        if (locationErrorTimeout) {
            clearTimeout(locationErrorTimeout)
        }
    })
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
                    <Checkbox bind:checked={settings.showWeather}
                        >weather</Checkbox
                    >
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
                                {#if themeName !== 'custom'}
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
                                {/if}
                                <span class="theme-name"
                                    >{themes[themeName].displayName}</span
                                >
                            </RadioButton>
                        </div>
                    {/each}
                </div>
                {#if settings.currentTheme === 'custom'}
                    <div class="custom-colors-grid">
                        {#each customColorLabels as { key, label }}
                            <div class="color-input-row">
                                <input
                                    type="color"
                                    id="color-{key}"
                                    value={settings.customThemeColors[key]}
                                    oninput={(e) =>
                                        setCustomColor(key, e.target.value)}
                                />
                                <label for="color-{key}">{label}</label>
                                <input
                                    type="text"
                                    value={settings.customThemeColors[key]}
                                    oninput={(e) =>
                                        setCustomColor(key, e.target.value)}
                                    class="color-text"
                                />
                            </div>
                        {/each}
                    </div>
                    <button
                        class="button bottom"
                        onclick={() => {
                            settings.customThemeColors = {
                                ...defaultCustomColors,
                            }
                        }}
                    >
                        <span class="bracket">[</span><span class="action-text"
                            >reset custom theme</span
                        ><span class="bracket">]</span>
                    </button>
                {/if}
            </div>
            <div class="group">
                <div class="split">
                    <div class="col">
                        <label for="font">font</label>
                        <input
                            id="font"
                            type="text"
                            bind:value={settings.font}
                            placeholder="Geist Mono Variable"
                        />
                    </div>
                    <div class="col font-weight-col">
                        <label for="font-weight">weight</label>
                        <input
                            id="font-weight"
                            type="number"
                            bind:value={settings.fontWeight}
                            min="1"
                            max="1000"
                            placeholder="400"
                        />
                    </div>
                </div>
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
                    <RadioButton bind:group={settings.taskBackend} value="local"
                        >local</RadioButton
                    >
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
                        [{googleSignInLabel()}]
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
                    <RadioButton bind:group={settings.locationMode} value="auto"
                        >auto</RadioButton
                    >
                </div>
            </div>

            {#if settings.locationMode === 'manual'}
                <div class="group">
                    <div class="split">
                        <div class="col">
                            <label for="latitude">weather latitude</label>
                            <input
                                id="latitude"
                                type="number"
                                bind:value={settings.latitude}
                                step="0.01"
                            />
                        </div>
                        <div class="col">
                            <label for="longitude">weather longitude</label>
                            <input
                                id="longitude"
                                type="number"
                                bind:value={settings.longitude}
                                step="0.01"
                            />
                        </div>
                    </div>
                    <button
                        class="button bottom"
                        onclick={useCurrentLocation}
                        disabled={locationLoading}
                    >
                        <span class="bracket">[</span><span class="action-text"
                            >{locationError ||
                                (locationLoading
                                    ? 'getting location...'
                                    : 'use current location')}</span
                        ><span class="bracket">]</span>
                    </button>
                </div>
            {/if}

            <div class="group">
                <div class="setting-label">time format</div>
                <div class="radio-group">
                    <RadioButton bind:group={settings.timeFormat} value="12hr"
                        >12 hour</RadioButton
                    >
                    <RadioButton bind:group={settings.timeFormat} value="24hr"
                        >24 hour</RadioButton
                    >
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
                    <RadioButton bind:group={settings.speedUnit} value="mph"
                        >mph</RadioButton
                    >
                    <RadioButton bind:group={settings.speedUnit} value="kmh"
                        >kmh</RadioButton
                    >
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
                <div class="setting-label">link icons</div>
                <div class="radio-group">
                    <RadioButton
                        bind:group={settings.linkIconMode}
                        value="icons"
                    >
                        show icons
                    </RadioButton>
                    <RadioButton
                        bind:group={settings.linkIconMode}
                        value="arrow"
                    >
                        show &gt;
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

                        {@const _ = initPrevDomain(link)}
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
                            <button
                                class="icon-btn"
                                title={link.icon || 'pick icon'}
                                onclick={() => toggleIconPicker(index)}
                                draggable="false"
                            >
                                {#if isValidSlug(link.icon)}
                                    <span class="si si-{link.icon}"></span>
                                {:else}
                                    <span class="icon-placeholder">></span>
                                {/if}
                            </button>
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
                                onchange={() => handleUrlChange(link)}
                                placeholder="https://example.com"
                                class="link-input"
                                draggable="false"
                            />
                            <input
                                type="text"
                                bind:value={link.hotkey}
                                placeholder="⌘"
                                class="link-input hotkey"
                                maxlength="1"
                                draggable="false"
                                oninput={(e) => {
                                    link.hotkey = e.target.value.slice(-1)
                                }}
                            />
                            <button
                                class="remove-btn"
                                onclick={() => removeLink(index)}
                            >
                                x
                            </button>
                        </div>
                        {#if iconPickerOpen === index}
                            <IconPicker
                                bind:this={iconPickerRef}
                                icon={link.icon}
                                onselect={(slug) => {
                                    link.icon = slug
                                    iconPickerOpen = null
                                }}
                            />
                        {/if}
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
                <label for="ping-url">ping stats url</label>
                <input
                    id="ping-url"
                    type="text"
                    bind:value={settings.pingUrl}
                    placeholder="https://www.google.com/generate_204"
                />
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
            <div class="group">
                <div class="setting-label">manage settings</div>
                <div class="settings-actions">
                    <button onclick={handleImport}
                        ><span class="bracket">[</span><span class="action-text"
                            >import json</span
                        ><span class="bracket">]</span></button
                    >
                    <button onclick={handleExport}
                        ><span class="bracket">[</span><span class="action-text"
                            >export json</span
                        ><span class="bracket">]</span></button
                    >
                    <button onclick={handleReset}
                        ><span class="bracket">[</span><span class="action-text"
                            >reset settings</span
                        ><span class="bracket">]</span></button
                    >
                </div>
            </div>
            <input
                type="file"
                accept=".json"
                bind:this={fileInput}
                onchange={handleFileSelect}
                style="display: none;"
            />
            <div class="version">
                re-start{#if version}&nbsp;v{version}{/if} •
                <a href="https://github.com/refact0r/re-start" target="_blank"
                    ><span class="bracket">[</span><span class="action-text"
                        >github</span
                    ><span class="bracket">]</span></a
                >
                • made with ❤️ by
                <a href="https://refact0r.dev" target="_blank"
                    ><span class="bracket">[</span><span class="action-text"
                        >refact0r</span
                    ><span class="bracket">]</span></a
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
        font-weight: var(--font-weight-light);
    }
    .content {
        flex: 1;
        padding: 1.5rem;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: var(--bg-3) var(--bg-1);
    }
    .split {
        display: flex;
        gap: 1rem;
    }
    .col {
        flex: 1;
    }
    .font-weight-col {
        flex: 0 0 5rem;
    }
    .group {
        flex: 1;
        margin-bottom: 1.5rem;
    }
    .group > label,
    .col > label,
    .setting-label {
        display: block;
        margin-bottom: 0.5rem;
    }
    .group input[type='text'],
    .group input[type='password'],
    .group input[type='number'],
    .group input[type='url'],
    .group textarea {
        width: 100%;
        padding: 0.375rem;
        background: var(--bg-2);
        border: 2px solid var(--bg-3);
    }
    .group textarea {
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

        .setting-label {
            margin: 0;
        }
    }
    .links-list {
        display: flex;
        flex-direction: column;
    }
    .add-btn {
        height: 1.5rem;
    }
    .drop-zone {
        height: 0.5rem;
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
        /*border: 2px solid transparent;*/
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
    .icon-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2.5rem;
        height: 2.5rem;
        margin-right: 0.5rem;
        border: 2px solid var(--bg-3);
        background: var(--bg-2);
        color: var(--txt-2);
        flex-shrink: 0;
    }
    .icon-btn:hover {
        border-color: var(--txt-3);
        color: var(--txt-1);
    }
    .icon-placeholder {
        color: var(--txt-3);
        font-size: 0.875rem;
    }
    .link .link-input.name {
        width: 6rem;
        margin-right: 0.5rem;
        flex-shrink: 0;
    }
    .link .link-input:not(.name):not(.hotkey) {
        flex: 1;
        min-width: 0;
        margin-right: 0.5rem;
    }
    .link .link-input.hotkey {
        width: 2rem;
        margin-right: 0.5rem;
        text-align: center;
        flex-shrink: 0;
    }
    .remove-btn {
        padding: 0 0.25rem 0 0.5rem;
        font-size: 1.125rem;
        font-weight: var(--font-weight-light);
    }
    .settings-actions {
        display: flex;
        gap: 1rem;
        margin-bottom: 1rem;
    }
    .bracket {
        color: var(--txt-3);
    }
    .action-text {
        color: var(--txt-2);
    }
    button:hover .bracket,
    a:hover .bracket {
        color: var(--txt-2);
    }
    button.bottom {
        margin-top: 0.5rem;
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
        flex: 1;
    }
    .radio-group,
    .checkbox-group {
        display: flex;
        gap: 3ch;
    }
    .custom-colors-grid {
        margin-top: 1rem;
        display: grid;
        grid-template-columns: 1fr 1fr;
        grid-template-rows: repeat(4, auto);
        grid-auto-flow: column;
        gap: 0.5rem 1rem;
    }
    .color-input-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;

        label {
            color: var(--txt-2);
            width: 3.25rem;
            flex-shrink: 0;
        }
    }
    input[type='color'] {
        width: 1.25rem;
        height: 1.25rem;
        padding: 0;
        border: 2px solid var(--bg-3);
        background: none;
        cursor: pointer;
        flex-shrink: 0;

        &::-webkit-color-swatch-wrapper {
            padding: 0;
        }
        &::-webkit-color-swatch {
            border: none;
        }
        &::-moz-color-swatch {
            border: none;
        }
    }
    input[type='text'].color-text {
        font-size: 0.875rem;
        color: inherit;
    }
</style>
