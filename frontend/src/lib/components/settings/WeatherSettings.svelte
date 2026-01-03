<script lang="ts">
    import { settings } from '../../settings-store.svelte'
    import {
        Checkbox,
        FormGroup,
        RadioGroup,
        NumberInput,
        Button,
        InlineGroup,
        GridGroup,
        RadioButton,
    } from '../ui'

    let locationLoading = $state(false)
    let locationError = $state<string | null>(null)

    async function useCurrentLocation(): Promise<void> {
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

<FormGroup>
    <Checkbox bind:checked={settings.showWeather}>enabled</Checkbox>
</FormGroup>

{#if settings.showWeather}
    <FormGroup label="location">
        <RadioGroup>
            <RadioButton bind:group={settings.locationMode} value="manual">
                manual
            </RadioButton>
            <RadioButton bind:group={settings.locationMode} value="auto">
                auto
            </RadioButton>
        </RadioGroup>
    </FormGroup>

    {#if settings.locationMode === 'manual'}
        <InlineGroup>
            <FormGroup label="latitude">
                <NumberInput
                    bind:value={settings.latitude}
                    id="latitude"
                    step="0.01"
                />
            </FormGroup>
            <FormGroup label="longitude">
                <NumberInput
                    bind:value={settings.longitude}
                    id="longitude"
                    step="0.01"
                />
            </FormGroup>
            <FormGroup autoWidth>
                <span>&nbsp;</span>
                <Button onclick={useCurrentLocation} disabled={locationLoading}>
                    {locationError ?? (locationLoading ? '...' : 'detect')}
                </Button>
            </FormGroup>
        </InlineGroup>
    {/if}

    <GridGroup columns={2}>
        <FormGroup label="temperature">
            <RadioGroup>
                <RadioButton bind:group={settings.tempUnit} value="fahrenheit">
                    °F
                </RadioButton>
                <RadioButton bind:group={settings.tempUnit} value="celsius">
                    °C
                </RadioButton>
            </RadioGroup>
        </FormGroup>
        <FormGroup label="speed">
            <RadioGroup>
                <RadioButton bind:group={settings.speedUnit} value="mph">
                    mph
                </RadioButton>
                <RadioButton bind:group={settings.speedUnit} value="kmh">
                    km/h
                </RadioButton>
            </RadioGroup>
        </FormGroup>
    </GridGroup>
{/if}
