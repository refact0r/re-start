<script lang="ts">
    import { settings, saveSettings } from '../../settings-store.svelte'
    import { createTaskBackend } from '../../backends/index'
    import type GoogleTasksBackend from '../../backends/google-tasks-backend'
    import { Button, VerifyButton } from '../ui'
    import IntegrationCard from './IntegrationCard.svelte'

    let googleTasksApi = $state<GoogleTasksBackend | null>(null)
    let signingIn = $state(false)
    let signInError = $state('')
    let googleUserEmail = $state(
        localStorage.getItem('google_user_email') || ''
    )

    let verifyingTodoist = $state(false)
    // eslint-disable-next-line svelte/prefer-writable-derived
    let todoistVerified = $state<boolean | null>(null)

    let verifyingUnsplash = $state(false)
    // eslint-disable-next-line svelte/prefer-writable-derived
    let unsplashVerified = $state<boolean | null>(null)

    function loadVerification(key: string, token: string): boolean | null {
        if (!token) return null
        try {
            const stored = localStorage.getItem(`verify_${key}`)
            if (stored) {
                const { token: storedToken, valid } = JSON.parse(stored)
                if (storedToken === token) return valid
            }
        } catch (_e) {
            // Ignore parsing errors - return null to indicate unknown state
        }
        return null
    }

    function saveVerification(
        key: string,
        token: string,
        valid: boolean
    ): void {
        try {
            localStorage.setItem(
                `verify_${key}`,
                JSON.stringify({ token, valid })
            )
        } catch (_e) {
            // Ignore localStorage errors (quota exceeded, etc.)
        }
    }

    async function handleGoogleSignIn(): Promise<void> {
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

    async function handleGoogleSignOut(): Promise<void> {
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

    async function verifyTodoistKey(): Promise<void> {
        if (!settings.todoistApiToken) {
            todoistVerified = false
            return
        }

        verifyingTodoist = true
        todoistVerified = null

        try {
            const response = await fetch(
                'https://api.todoist.com/sync/v9/sync',
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${settings.todoistApiToken}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: 'sync_token=*&resource_types=["user"]',
                }
            )

            todoistVerified = response.ok
            saveVerification(
                'todoist',
                settings.todoistApiToken,
                todoistVerified
            )
        } catch (err) {
            console.error('Todoist verification error:', err)
            todoistVerified = false
            saveVerification('todoist', settings.todoistApiToken, false)
        } finally {
            verifyingTodoist = false
        }
    }

    async function verifyUnsplashKey(): Promise<void> {
        if (!settings.unsplashApiKey) {
            unsplashVerified = false
            return
        }

        verifyingUnsplash = true
        unsplashVerified = null

        try {
            const response = await fetch(
                'https://api.unsplash.com/photos/random?count=1',
                {
                    headers: {
                        Authorization: `Client-ID ${settings.unsplashApiKey}`,
                    },
                }
            )

            unsplashVerified = response.ok
            saveVerification(
                'unsplash',
                settings.unsplashApiKey,
                unsplashVerified
            )
        } catch (err) {
            console.error('Unsplash verification error:', err)
            unsplashVerified = false
            saveVerification('unsplash', settings.unsplashApiKey, false)
        } finally {
            verifyingUnsplash = false
        }
    }

    $effect(() => {
        todoistVerified = loadVerification('todoist', settings.todoistApiToken)
    })

    $effect(() => {
        unsplashVerified = loadVerification('unsplash', settings.unsplashApiKey)
    })
</script>

<IntegrationCard
    name="google"
    description="tasks & calendar"
    email={settings.googleTasksSignedIn ? googleUserEmail : ''}
>
    <Button
        onclick={settings.googleTasksSignedIn
            ? handleGoogleSignOut
            : handleGoogleSignIn}
        disabled={signingIn}
    >
        {settings.googleTasksSignedIn
            ? 'sign out'
            : signInError
              ? signInError
              : signingIn
                ? 'signing in...'
                : 'sign in'}
    </Button>
</IntegrationCard>

<IntegrationCard name="todoist" description="tasks" stacked>
    <input
        id="todoist-token"
        type="password"
        autocomplete="off"
        data-1p-ignore
        data-bwignore
        data-lpignore="true"
        data-form-type="other"
        bind:value={settings.todoistApiToken}
        placeholder="api token"
    />
    <VerifyButton
        onclick={verifyTodoistKey}
        verifying={verifyingTodoist}
        verified={todoistVerified}
        disabled={!settings.todoistApiToken}
    />
</IntegrationCard>

<IntegrationCard name="unsplash" description="background images" stacked>
    <input
        id="unsplash-key"
        type="password"
        autocomplete="off"
        data-1p-ignore
        data-bwignore
        data-lpignore="true"
        data-form-type="other"
        bind:value={settings.unsplashApiKey}
        placeholder="api key"
    />
    <VerifyButton
        onclick={verifyUnsplashKey}
        verifying={verifyingUnsplash}
        verified={unsplashVerified}
        disabled={!settings.unsplashApiKey}
    />
</IntegrationCard>
