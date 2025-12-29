<script>
    import { settings, saveSettings } from '../../settings-store.svelte.js'
    import { createTaskBackend } from '../../backends/index.js'

    let googleTasksApi = $state(null)
    let signingIn = $state(false)
    let signInError = $state('')
    let googleUserEmail = $state(localStorage.getItem('google_user_email') || '')

    // Todoist verification state
    let verifyingTodoist = $state(false)
    let todoistVerified = $state(loadVerification('todoist', settings.todoistApiToken))

    // Unsplash verification state
    let verifyingUnsplash = $state(false)
    let unsplashVerified = $state(loadVerification('unsplash', settings.unsplashApiKey))

    // Load/save verification status from localStorage
    function loadVerification(key, token) {
        if (!token) return null
        try {
            const stored = localStorage.getItem(`verify_${key}`)
            if (stored) {
                const { token: storedToken, valid } = JSON.parse(stored)
                if (storedToken === token) return valid
            }
        } catch (e) {}
        return null
    }

    function saveVerification(key, token, valid) {
        try {
            localStorage.setItem(`verify_${key}`, JSON.stringify({ token, valid }))
        } catch (e) {}
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

    async function verifyTodoistKey() {
        if (!settings.todoistApiToken) {
            todoistVerified = false
            return
        }

        verifyingTodoist = true
        todoistVerified = null

        try {
            const response = await fetch('https://api.todoist.com/sync/v9/sync', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${settings.todoistApiToken}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: 'sync_token=*&resource_types=["user"]'
            })

            todoistVerified = response.ok
            saveVerification('todoist', settings.todoistApiToken, todoistVerified)
        } catch (err) {
            console.error('Todoist verification error:', err)
            todoistVerified = false
            saveVerification('todoist', settings.todoistApiToken, false)
        } finally {
            verifyingTodoist = false
        }
    }

    async function verifyUnsplashKey() {
        if (!settings.unsplashApiKey) {
            unsplashVerified = false
            return
        }

        verifyingUnsplash = true
        unsplashVerified = null

        try {
            const response = await fetch('https://api.unsplash.com/photos/random?count=1', {
                headers: {
                    'Authorization': `Client-ID ${settings.unsplashApiKey}`
                }
            })

            unsplashVerified = response.ok
            saveVerification('unsplash', settings.unsplashApiKey, unsplashVerified)
        } catch (err) {
            console.error('Unsplash verification error:', err)
            unsplashVerified = false
            saveVerification('unsplash', settings.unsplashApiKey, false)
        } finally {
            verifyingUnsplash = false
        }
    }

    // Update verification status when keys change (load from cache or reset)
    $effect(() => {
        todoistVerified = loadVerification('todoist', settings.todoistApiToken)
    })

    $effect(() => {
        unsplashVerified = loadVerification('unsplash', settings.unsplashApiKey)
    })
</script>

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
    <div class="integration-content stacked">
        <input
            id="todoist-token"
            type="text"
            class="secret"
            autocomplete="off"
            bind:value={settings.todoistApiToken}
            placeholder="api token"
        />
        <button
            class="verify-link"
            class:valid={todoistVerified === true}
            class:invalid={todoistVerified === false}
            onclick={verifyTodoistKey}
            disabled={verifyingTodoist || !settings.todoistApiToken}
        >
            {#if verifyingTodoist}verifying...{:else if todoistVerified === true}valid{:else if todoistVerified === false}invalid{:else}verify{/if}
        </button>
    </div>
</div>

<div class="integration-card">
    <div class="integration-header">
        <span class="integration-name">unsplash</span>
        <span class="integration-desc">background images</span>
    </div>
    <div class="integration-content stacked">
        <input
            id="unsplash-key"
            type="text"
            class="secret"
            autocomplete="off"
            bind:value={settings.unsplashApiKey}
            placeholder="api key"
        />
        <button
            class="verify-link"
            class:valid={unsplashVerified === true}
            class:invalid={unsplashVerified === false}
            onclick={verifyUnsplashKey}
            disabled={verifyingUnsplash || !settings.unsplashApiKey}
        >
            {#if verifyingUnsplash}verifying...{:else if unsplashVerified === true}valid{:else if unsplashVerified === false}invalid{:else}verify{/if}
        </button>
    </div>
</div>

<style>
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
        gap: 0.5rem;
    }
    .integration-content.stacked {
        flex-direction: column;
        align-items: flex-end;
        gap: 0.25rem;
    }
    .integration-content input {
        width: 10rem;
        padding: 0.375rem 0.5rem;
        background: var(--bg-1);
        border: 1px solid var(--bg-3);
    }
    .verify-link {
        background: none;
        border: none;
        padding: 0;
        font: inherit;
        font-size: 0.7rem;
        color: var(--txt-3);
        cursor: pointer;
    }
    .verify-link:hover {
        color: var(--txt-2);
    }
    .verify-link:disabled {
        cursor: default;
    }
    .verify-link.valid {
        color: #4ade80;
    }
    .verify-link.invalid {
        color: var(--txt-err);
    }
    .secret {
        filter: blur(4px);
        transition: filter 0.15s ease;
    }
    .secret:focus {
        filter: none;
    }
</style>
