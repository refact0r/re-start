<script lang="ts">
    import { settings } from '../../settings-store.svelte'
    import { FormGroup, RadioGroup, GridGroup, RadioButton } from '../ui'
</script>

<GridGroup columns={2}>
    <FormGroup label="time format">
        <RadioGroup>
            <RadioButton bind:group={settings.timeFormat} value="12hr">
                12h
            </RadioButton>
            <RadioButton bind:group={settings.timeFormat} value="24hr">
                24h
            </RadioButton>
        </RadioGroup>
    </FormGroup>
    <FormGroup label="date format">
        <RadioGroup>
            <RadioButton bind:group={settings.dateFormat} value="mdy">
                m/d/y
            </RadioButton>
            <RadioButton bind:group={settings.dateFormat} value="dmy">
                d/m/y
            </RadioButton>
        </RadioGroup>
    </FormGroup>
</GridGroup>
