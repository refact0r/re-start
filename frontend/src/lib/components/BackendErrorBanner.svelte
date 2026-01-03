<script lang="ts">
    import { RefreshCw, ServerOff } from 'lucide-svelte'
    import {
        backendStatus,
        forceCheckBackendHealth,
    } from '../backend-status.svelte'

    let isChecking = $state(false)

    async function handleRetry(): Promise<void> {
        isChecking = true
        await forceCheckBackendHealth()
        isChecking = false
    }
</script>

{#if backendStatus.isOnline === false}
    <div class="banner">
        <div class="content">
            <ServerOff size={32} strokeWidth={1.5} />
            <div class="text">
                <h2>Backend Server Unavailable</h2>
                <p>
                    The backend server is not running. Google Calendar, Tasks,
                    and authentication features are disabled.
                </p>
                <p class="hint">
                    Start the backend server with: <code
                        >cd backend && node server.js</code
                    >
                </p>
            </div>
        </div>
        <button class="retry-btn" onclick={handleRetry} disabled={isChecking}>
            <RefreshCw size={16} class={isChecking ? 'spinning' : ''} />
            {isChecking ? 'Checking...' : 'Retry'}
        </button>
    </div>
{/if}

<style>
    .banner {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(
            135deg,
            oklch(25% 0.08 15) 0%,
            oklch(20% 0.06 15) 100%
        );
        border-bottom: 1px solid oklch(35% 0.1 15);
        padding: 1rem 1.5rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1.5rem;
        z-index: 1000;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }

    .content {
        display: flex;
        align-items: center;
        gap: 1rem;
        color: oklch(85% 0.12 15);
    }

    .text {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    h2 {
        margin: 0;
        font-size: 1rem;
        font-weight: 500;
        color: oklch(90% 0.1 15);
    }

    p {
        margin: 0;
        font-size: 0.85rem;
        color: oklch(75% 0.08 15);
    }

    .hint {
        font-size: 0.8rem;
        color: oklch(65% 0.06 15);
    }

    code {
        background: oklch(15% 0.03 15);
        padding: 0.15rem 0.4rem;
        border-radius: 3px;
        font-family: var(--font-family);
        font-size: 0.75rem;
    }

    .retry-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: oklch(30% 0.06 15);
        border: 1px solid oklch(40% 0.08 15);
        border-radius: 6px;
        color: oklch(85% 0.08 15);
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.15s ease;
        white-space: nowrap;
    }

    .retry-btn:hover:not(:disabled) {
        background: oklch(35% 0.07 15);
        border-color: oklch(45% 0.09 15);
        color: oklch(95% 0.06 15);
    }

    .retry-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    :global(.spinning) {
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }
</style>
