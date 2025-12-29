<script>
    import { settings } from '../../settings-store.svelte.js'
    import RadioButton from '../RadioButton.svelte'
</script>

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

<style>
    .group {
        width: 100%;
        margin-bottom: 1.5rem;
    }
    .setting-label {
        display: block;
        margin-bottom: 0.5rem;
    }
    .radio-group {
        display: flex;
        gap: 3ch;
    }
    .radio-wrapper.disabled {
        cursor: help;
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
</style>
