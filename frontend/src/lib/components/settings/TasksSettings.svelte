<script lang="ts">
    import { settings } from '../../settings-store.svelte'
    import { Checkbox, FormGroup, RadioGroup, RadioButton, Hint } from '../ui'
</script>

<FormGroup>
    <Checkbox bind:checked={settings.showTasks}>enabled</Checkbox>
</FormGroup>

{#if settings.showTasks}
    <FormGroup label="source">
        <RadioGroup>
            <RadioButton bind:group={settings.taskBackend} value="local">
                local
            </RadioButton>
            <Hint
                disabled={!settings.todoistApiToken}
                hint="add todoist api token in integrations"
            >
                <RadioButton
                    bind:group={settings.taskBackend}
                    value="todoist"
                    disabled={!settings.todoistApiToken}
                >
                    todoist
                </RadioButton>
            </Hint>
            <Hint
                disabled={!settings.googleTasksSignedIn}
                hint="sign in to google in integrations"
            >
                <RadioButton
                    bind:group={settings.taskBackend}
                    value="google-tasks"
                    disabled={!settings.googleTasksSignedIn}
                >
                    google
                </RadioButton>
            </Hint>
        </RadioGroup>
    </FormGroup>
{/if}
