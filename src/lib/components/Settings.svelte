<script>
    import { fade, fly } from 'svelte/transition'
    import {
        saveSettings,
        settings,
        resetSettings,
    } from '../settings-store.svelte.js'
    import { themeNames, themes } from '../themes.js'
    import RadioButton from './RadioButton.svelte'
    import { createTaskBackend, createCalendarBackend } from '../backends/index.js'
    import { Paintbrush, Plug, Clock, Sun, SquareCheck, Calendar, Link } from 'lucide-svelte'

    let { showSettings = false, closeSettings, refreshBackground = null, background = null } = $props()

    const tabs = [
        { id: 'appearance', icon: Paintbrush, title: 'Appearance' },
        { id: 'integrations', icon: Plug, title: 'Integrations' },
        { id: 'clock', icon: Clock, title: 'Clock' },
        { id: 'weather', icon: Sun, title: 'Weather' },
        { id: 'tasks', icon: SquareCheck, title: 'Tasks' },
        { id: 'calendar', icon: Calendar, title: 'Calendar' },
        { id: 'links', icon: Link, title: 'Links' }
    ]
    let activeTab = $state('appearance')
    let tabElements = $state({})
    let indicatorStyle = $state('')

    $effect(() => {
        const el = tabElements[activeTab]
        if (el) {
            indicatorStyle = `left: ${el.offsetLeft}px; width: ${el.offsetWidth}px`
        }
    })

    let refreshingBackground = $state(false)

    // @ts-ignore
    const version = __APP_VERSION__

    let googleTasksApi = $state(null)
    let signingIn = $state(false)
    let signInError = $state('')
    let googleUserEmail = $state(localStorage.getItem('google_user_email') || '')

    // Calendar selection
    let availableCalendars = $state([])
    let loadingCalendars = $state(false)

    async function fetchCalendars() {
        if (!settings.googleTasksSignedIn) return

        try {
            loadingCalendars = true
            const calendarApi = createCalendarBackend()
            availableCalendars = await calendarApi.fetchCalendarList()
        } catch (err) {
            console.error('Failed to fetch calendars:', err)
            availableCalendars = []
        } finally {
            loadingCalendars = false
        }
    }

    function toggleCalendar(calendarId) {
        if (settings.selectedCalendars.includes(calendarId)) {
            settings.selectedCalendars = settings.selectedCalendars.filter(id => id !== calendarId)
        } else {
            settings.selectedCalendars = [...settings.selectedCalendars, calendarId]
        }
    }

    // Fetch calendars when settings opens and user is signed in
    $effect(() => {
        if (showSettings && settings.googleTasksSignedIn && settings.showCalendar) {
            fetchCalendars()
        }
    })

    async function handleGoogleSignIn() {
        try {
            signingIn = true
            signInError = ''

            if (!googleTasksApi) {
                googleTasksApi = createTaskBackend('google-tasks')
            }

            await googleTasksApi.signIn()
            settings.googleTasksSignedIn = true
            googleUserEmail = googleTasksApi.getUserEmail() || ''
            saveSettings(settings)
        } catch (err) {
            console.error('Google sign-in error:', err)
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
            googleUserEmail = ''
            saveSettings(settings)
            signInError = ''
        } catch (err) {
            console.error('Google sign-out error:', err)
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
    let dragOverIndex = $state(null)

    function handleDragStart(event, index) {
        draggedIndex = index
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/html', event.currentTarget)
    }

    function handleDragOver(event, index) {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        dragOverIndex = index
    }

    function handleDragLeave() {
        dragOverIndex = null
    }

    function handleDrop(event, dropIndex) {
        event.preventDefault()

        if (draggedIndex !== null && draggedIndex !== dropIndex) {
            const newLinks = [...settings.links]
            const draggedItem = newLinks[draggedIndex]

            // Remove the dragged item
            newLinks.splice(draggedIndex, 1)

            // Insert at the new position
            if (draggedIndex < dropIndex) {
                newLinks.splice(dropIndex, 0, draggedItem)
            } else {
                // Dragging backward: place before target
                newLinks.splice(dropIndex, 0, draggedItem)
            }

            settings.links = newLinks
        }

        draggedIndex = null
        dragOverIndex = null
    }

    function handleDragEnd() {
        draggedIndex = null
        dragOverIndex = null
    }

    let locationLoading = $state(false)
    let locationError = $state(null)

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

        <nav class="tabs">
            {#each tabs as tab}
                <button
                    class="tab"
                    class:active={activeTab === tab.id}
                    onclick={() => activeTab = tab.id}
                    title={tab.title}
                    bind:this={tabElements[tab.id]}
                >
                    <tab.icon size={18} strokeWidth={2} />
                </button>
            {/each}
            <div class="tab-indicator" style={indicatorStyle}></div>
        </nav>

        <div class="content">
            <!-- APPEARANCE -->
            {#if activeTab === 'appearance'}
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

            <h3 class="section-title">custom css</h3>

            <div class="group">
                <textarea
                    id="custom-css"
                    bind:value={settings.customCSS}
                    placeholder="/* add your custom styles here */"
                    rows="6"
                ></textarea>
            </div>
            {/if}

            <!-- INTEGRATIONS -->
            {#if activeTab === 'integrations'}

            <div class="integration-card">
                <div class="integration-header">
                    <span class="integration-name">google</span>
                    <span class="integration-desc">tasks & calendar</span>
                    {#if settings.googleTasksSignedIn && googleUserEmail}
                        <span class="integration-email">{googleUserEmail}</span>
                    {/if}
                </div>
                <div class="integration-content">
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
                                : 'sign in'}]
                    </button>
                </div>
            </div>

            <div class="integration-card">
                <div class="integration-header">
                    <span class="integration-name">todoist</span>
                    <span class="integration-desc">tasks</span>
                </div>
                <div class="integration-content">
                    <input
                        id="todoist-token"
                        type="password"
                        bind:value={settings.todoistApiToken}
                        placeholder="api token"
                    />
                </div>
            </div>
            {/if}

            <!-- CLOCK -->
            {#if activeTab === 'clock'}

            <div class="format-grid">
                <div class="group">
                    <div class="setting-label">time format</div>
                    <div class="radio-group">
                        <RadioButton bind:group={settings.timeFormat} value="12hr">
                            12h
                        </RadioButton>
                        <RadioButton bind:group={settings.timeFormat} value="24hr">
                            24h
                        </RadioButton>
                    </div>
                </div>
                <div class="group">
                    <div class="setting-label">date format</div>
                    <div class="radio-group">
                        <RadioButton bind:group={settings.dateFormat} value="mdy">
                            m/d/y
                        </RadioButton>
                        <RadioButton bind:group={settings.dateFormat} value="dmy">
                            d/m/y
                        </RadioButton>
                    </div>
                </div>
            </div>
            {/if}

            <!-- WEATHER -->
            {#if activeTab === 'weather'}
            <div class="group">
                <button class="checkbox-label" onclick={() => settings.showWeather = !settings.showWeather}>
                    <span class="checkbox">{settings.showWeather ? '[x]' : '[ ]'}</span>
                    enabled
                </button>
            </div>

            {#if settings.showWeather}
                <div class="group">
                    <div class="setting-label">location</div>
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
                    <div class="inline-group">
                        <div class="group">
                            <label for="latitude">latitude</label>
                            <input
                                id="latitude"
                                type="number"
                                bind:value={settings.latitude}
                                step="0.01"
                            />
                        </div>
                        <div class="group">
                            <label for="longitude">longitude</label>
                            <input
                                id="longitude"
                                type="number"
                                bind:value={settings.longitude}
                                step="0.01"
                            />
                        </div>
                        <div class="group auto-width">
                            <span class="spacer">&nbsp;</span>
                            <button
                                class="button"
                                onclick={useCurrentLocation}
                                disabled={locationLoading}
                            >
                                [{locationError
                                    ? locationError
                                    : locationLoading
                                      ? '...'
                                      : 'detect'}]
                            </button>
                        </div>
                    </div>
                {/if}

                <div class="format-grid">
                    <div class="group">
                        <div class="setting-label">temperature</div>
                        <div class="radio-group">
                            <RadioButton
                                bind:group={settings.tempUnit}
                                value="fahrenheit"
                            >
                                °F
                            </RadioButton>
                            <RadioButton bind:group={settings.tempUnit} value="celsius">
                                °C
                            </RadioButton>
                        </div>
                    </div>
                    <div class="group">
                        <div class="setting-label">speed</div>
                        <div class="radio-group">
                            <RadioButton bind:group={settings.speedUnit} value="mph">
                                mph
                            </RadioButton>
                            <RadioButton bind:group={settings.speedUnit} value="kmh">
                                km/h
                            </RadioButton>
                        </div>
                    </div>
                </div>
            {/if}
            {/if}

            <!-- TASKS -->
            {#if activeTab === 'tasks'}
            <div class="group">
                <button class="checkbox-label" onclick={() => settings.showTasks = !settings.showTasks}>
                    <span class="checkbox">{settings.showTasks ? '[x]' : '[ ]'}</span>
                    enabled
                </button>
            </div>

            {#if settings.showTasks}
                <div class="group">
                    <div class="setting-label">source</div>
                    <div class="radio-group">
                        <RadioButton
                            bind:group={settings.taskBackend}
                            value="local"
                        >
                            local
                        </RadioButton>
                        <span
                            class="radio-wrapper"
                            class:disabled={!settings.todoistApiToken}
                            title={!settings.todoistApiToken ? 'add todoist api token in integrations' : ''}
                        >
                            <RadioButton
                                bind:group={settings.taskBackend}
                                value="todoist"
                                disabled={!settings.todoistApiToken}
                            >
                                todoist
                            </RadioButton>
                        </span>
                        <span
                            class="radio-wrapper"
                            class:disabled={!settings.googleTasksSignedIn}
                            title={!settings.googleTasksSignedIn ? 'sign in to google in integrations' : ''}
                        >
                            <RadioButton
                                bind:group={settings.taskBackend}
                                value="google-tasks"
                                disabled={!settings.googleTasksSignedIn}
                            >
                                google
                            </RadioButton>
                        </span>
                    </div>
                </div>
            {/if}
            {/if}

            <!-- CALENDAR -->
            {#if activeTab === 'calendar'}
            {#if settings.googleTasksSignedIn}
                <div class="group">
                    <button class="checkbox-label" onclick={() => settings.showCalendar = !settings.showCalendar}>
                        <span class="checkbox">{settings.showCalendar ? '[x]' : '[ ]'}</span>
                        enabled
                    </button>
                </div>

                {#if settings.showCalendar}
                    <div class="group">
                        <div class="setting-label">calendars</div>
                        {#if loadingCalendars}
                            <div class="calendar-loading">loading...</div>
                        {:else if availableCalendars.length === 0}
                            <div class="calendar-loading">no calendars found</div>
                        {:else}
                            <div class="calendar-list">
                                {#each availableCalendars as calendar}
                                    <button class="checkbox-label calendar-item" onclick={() => toggleCalendar(calendar.id)}>
                                        <span class="checkbox">{settings.selectedCalendars.length === 0 || settings.selectedCalendars.includes(calendar.id) ? '[x]' : '[ ]'}</span>
                                        <span
                                            class="calendar-color"
                                            style="background-color: {calendar.color}"
                                        ></span>
                                        <span class="calendar-name">{calendar.name}</span>
                                        {#if calendar.primary}
                                            <span class="calendar-primary">(primary)</span>
                                        {/if}
                                    </button>
                                {/each}
                            </div>
                            {#if settings.selectedCalendars.length === 0}
                                <div class="calendar-hint">all calendars shown</div>
                            {/if}
                        {/if}
                    </div>
                {/if}
            {:else}
                <div class="calendar-not-signed-in">
                    sign in to google in integrations tab
                </div>
            {/if}
            {/if}

            <!-- LINKS -->
            {#if activeTab === 'links'}

            <div class="group">
                <button class="checkbox-label" onclick={() => settings.showLinks = !settings.showLinks}>
                    <span class="checkbox">{settings.showLinks ? '[x]' : '[ ]'}</span>
                    enabled
                </button>
            </div>

            {#if settings.showLinks}
                <div class="inline-group">
                    <div class="group">
                        <div class="setting-label">open in</div>
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
                    <div class="group small">
                        <label for="linksPerColumn">per column</label>
                        <input
                            id="linksPerColumn"
                            type="number"
                            bind:value={settings.linksPerColumn}
                            step="1"
                        />
                    </div>
                </div>

                <div class="group">
                    <div class="links-header">
                        <div class="setting-label">edit links</div>
                        <button class="add-btn" onclick={addLink}>+ add</button>
                    </div>
                    <div class="links-list">
                        {#each settings.links as link, index}
                            <div
                                class="link"
                                class:dragging={draggedIndex === index}
                                class:drag-over={dragOverIndex === index}
                                ondragover={(e) => handleDragOver(e, index)}
                                ondragleave={handleDragLeave}
                                ondrop={(e) => handleDrop(e, index)}
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
                    </div>
                </div>
            {/if}
            {/if}

            <!-- FOOTER -->
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
    .tabs {
        position: relative;
        display: flex;
        border-bottom: 2px solid var(--bg-3);
        padding: 0 1rem;
    }
    .tab {
        display: flex;
        align-items: center;
        padding: 0.75rem 1rem;
        color: var(--txt-3);
        background: none;
        border: none;
        cursor: pointer;
        transition: color 0.15s ease;
    }
    .tab:hover {
        color: var(--txt-2);
    }
    .tab.active {
        color: var(--txt-1);
    }
    .tab-indicator {
        position: absolute;
        bottom: -2px;
        height: 2px;
        background: var(--txt-2);
        transition: left 0.2s ease, width 0.2s ease;
    }
    .content {
        flex: 1;
        width: 100%;
        padding: 1.5rem;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: var(--bg-3) var(--bg-1);
        box-sizing: border-box;
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
    .group input[type='text'],
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
        align-items: center;
        margin-bottom: calc(0.5rem - 2px);
        border: 2px solid transparent;
    }
    .link.dragging {
        opacity: 0.5;
        border: 2px dashed var(--txt-3);
    }
    .link.drag-over {
        border: 2px solid var(--txt-2);
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
    .radio-group {
        display: flex;
        gap: 3ch;
    }
    .radio-wrapper.disabled {
        cursor: help;
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
    .spacer {
        display: block;
    }
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
    .inline-group .group.auto-width {
        flex: 0 0 auto;
    }
    .integration-card {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 1rem;
        margin-bottom: 0.5rem;
        background: var(--bg-2);
        border: 1px solid var(--bg-3);
    }
    .integration-header {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
    }
    .integration-name {
        color: var(--txt-1);
    }
    .integration-desc {
        font-size: 0.8rem;
        color: var(--txt-3);
    }
    .integration-email {
        font-size: 0.8rem;
        color: var(--txt-2);
    }
    .integration-content {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    .integration-content input {
        width: 12rem;
        padding: 0.375rem 0.5rem;
        background: var(--bg-1);
        border: 1px solid var(--bg-3);
    }
    .format-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem 2rem;
        margin-bottom: 1.5rem;
    }
    .format-grid .group {
        margin-bottom: 0;
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
    .calendar-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    .calendar-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    .calendar-color {
        width: 0.75rem;
        height: 0.75rem;
        border-radius: 2px;
        flex-shrink: 0;
    }
    .calendar-name {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .calendar-primary {
        color: var(--txt-3);
        font-size: 0.75rem;
    }
    .calendar-loading {
        color: var(--txt-3);
    }
    .calendar-hint {
        color: var(--txt-3);
        font-size: 0.75rem;
        margin-top: 0.5rem;
    }
    .calendar-not-signed-in {
        color: var(--txt-3);
    }
</style>
