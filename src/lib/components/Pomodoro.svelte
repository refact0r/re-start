<script>
    import { onMount, onDestroy } from 'svelte'
    import { settings } from '../stores/settings-store.svelte.js'

    let { class: className = '' } = $props()

    // Timer state
    let timeRemaining = $state(settings.pomodoroWorkMinutes * 60)
    let isRunning = $state(false)
    let timerInterval = null
    let mode = $state('work') // 'work', 'short-break', 'long-break'
    let sessionsCompleted = $state(0)
    let endTime = null // Stores when timer should end (for background tracking)

    // Format time as MM:SS
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    // Get label for current mode
    function getModeLabel() {
        switch (mode) {
            case 'work':
                return 'focus'
            case 'short-break':
                return 'short break'
            case 'long-break':
                return 'long break'
        }
    }

    // Play notification sound
    function playSound() {
        if (!settings.pomodoroSound) return
        try {
            // Create a simple beep using Web Audio API
            const audioContext = new (window.AudioContext || window.webkitAudioContext)()
            const oscillator = audioContext.createOscillator()
            const gainNode = audioContext.createGain()

            oscillator.connect(gainNode)
            gainNode.connect(audioContext.destination)

            oscillator.frequency.value = 800
            oscillator.type = 'sine'
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

            oscillator.start(audioContext.currentTime)
            oscillator.stop(audioContext.currentTime + 0.5)
        } catch (error) {
            console.error('failed to play sound:', error)
        }
    }

    // Show browser notification
    function showNotification(title, body) {
        if (!('Notification' in window)) return

        if (Notification.permission === 'granted') {
            new Notification(title, { body })
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then((permission) => {
                if (permission === 'granted') {
                    new Notification(title, { body })
                }
            })
        }
    }

    // Handle timer completion
    function handleTimerComplete() {
        playSound()

        if (mode === 'work') {
            sessionsCompleted++
            if (sessionsCompleted >= 4) {
                // Long break after 4 sessions
                mode = 'long-break'
                timeRemaining = settings.pomodoroLongBreak * 60
                sessionsCompleted = 0
                showNotification('Pomodoro', 'Great work! Time for a long break.')
            } else {
                // Short break
                mode = 'short-break'
                timeRemaining = settings.pomodoroShortBreak * 60
                showNotification('Pomodoro', 'Good job! Take a short break.')
            }
        } else {
            // Break is over, start work
            mode = 'work'
            timeRemaining = settings.pomodoroWorkMinutes * 60
            showNotification('Pomodoro', 'Break is over. Ready to focus?')
        }

        isRunning = false
    }

    // Timer tick
    function tick() {
        if (timeRemaining > 0) {
            timeRemaining--
        } else {
            clearInterval(timerInterval)
            timerInterval = null
            handleTimerComplete()
        }
    }

    // Start timer
    function start() {
        if (isRunning) return
        isRunning = true
        endTime = Date.now() + timeRemaining * 1000
        timerInterval = setInterval(tick, 1000)
    }

    // Pause timer
    function pause() {
        if (!isRunning) return
        isRunning = false
        endTime = null
        if (timerInterval) {
            clearInterval(timerInterval)
            timerInterval = null
        }
    }

    // Reset timer
    function reset() {
        pause()
        mode = 'work'
        sessionsCompleted = 0
        timeRemaining = settings.pomodoroWorkMinutes * 60
        endTime = null
    }

    // Skip to next phase
    function skip() {
        pause()
        endTime = null
        if (mode === 'work') {
            sessionsCompleted++
            if (sessionsCompleted >= 4) {
                mode = 'long-break'
                timeRemaining = settings.pomodoroLongBreak * 60
                sessionsCompleted = 0
            } else {
                mode = 'short-break'
                timeRemaining = settings.pomodoroShortBreak * 60
            }
        } else {
            mode = 'work'
            timeRemaining = settings.pomodoroWorkMinutes * 60
        }
    }

    // Handle visibility change - pause interval when hidden, resume when visible
    function handleVisibilityChange() {
        if (document.visibilityState === 'hidden') {
            // Pause interval to save battery, but keep tracking via endTime
            if (timerInterval) {
                clearInterval(timerInterval)
                timerInterval = null
            }
        } else if (document.visibilityState === 'visible' && isRunning && endTime) {
            // Calculate remaining time based on when timer should end
            const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000))

            if (remaining <= 0) {
                // Timer completed while in background
                timeRemaining = 0
                handleTimerComplete()
            } else {
                timeRemaining = remaining
                timerInterval = setInterval(tick, 1000)
            }
        }
    }

    onMount(() => {
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission()
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)
    })

    onDestroy(() => {
        if (timerInterval) {
            clearInterval(timerInterval)
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange)
    })
</script>

<div class="panel-wrapper {className}">
    <div class="panel-label">pomodoro</div>
    <div class="panel">
        <div class="mode-label">{getModeLabel()}</div>
        <div class="timer">{formatTime(timeRemaining)}</div>
        <div class="sessions">
            {#each Array(4) as _, i}
                <span class="session-dot" class:filled={i < sessionsCompleted}></span>
            {/each}
        </div>
        <div class="controls">
            {#if isRunning}
                <button onclick={pause}>[pause]</button>
            {:else}
                <button onclick={start}>[start]</button>
            {/if}
            <button onclick={reset}>[reset]</button>
            <button onclick={skip}>[skip]</button>
        </div>
    </div>
</div>

<style>
    .panel-wrapper {
        flex-shrink: 0;
    }
    .panel-wrapper.expand {
        flex-grow: 1;
    }
    .mode-label {
        font-size: 0.875rem;
        color: var(--txt-3);
        margin-bottom: 0.25rem;
    }
    .timer {
        font-size: 2.5rem;
        font-weight: 300;
        color: var(--txt-num);
        line-height: 3rem;
        margin-bottom: 0.5rem;
    }
    .sessions {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
    }
    .session-dot {
        width: 0.5rem;
        height: 0.5rem;
        border: 1px solid var(--txt-3);
        border-radius: 50%;
    }
    .session-dot.filled {
        background-color: var(--txt-orange);
        border-color: var(--txt-orange);
    }
    .controls {
        display: flex;
        gap: 1rem;
    }
    .controls button {
        color: var(--txt-link);
    }
    .controls button:hover {
        color: var(--txt-4);
    }
</style>
