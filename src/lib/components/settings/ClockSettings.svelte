<script>
    import { settings } from '../../settings-store.svelte.js'
    import RadioButton from '../RadioButton.svelte'
</script>

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
    .format-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem 2rem;
        margin-bottom: 1.5rem;
    }
    .format-grid .group {
        margin-bottom: 0;
    }
</style>
