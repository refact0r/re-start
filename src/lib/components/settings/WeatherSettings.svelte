<script>
    import { settings } from '../../settings-store.svelte.js'
    import RadioButton from '../RadioButton.svelte'

    let locationLoading = $state(false)
    let locationError = $state(null)

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

<style>
    .group {
        width: 100%;
        margin-bottom: 1.5rem;
    }
    .group > label,
    .setting-label {
        display: block;
        margin-bottom: 0.5rem;
    }
    .group input[type='number'] {
        width: 100%;
        padding: 0.5rem;
        background: var(--bg-2);
        border: 2px solid var(--bg-3);
    }
    .radio-group {
        display: flex;
        gap: 3ch;
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
    .inline-group {
        display: flex;
        gap: 1rem;
        margin-bottom: 1.5rem;
    }
    .inline-group .group {
        flex: 1;
        margin-bottom: 0;
    }
    .inline-group .group.auto-width {
        flex: 0 0 auto;
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
