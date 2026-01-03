<script lang="ts">
    let {
        value = $bindable(),
        id = '',
        min = 0,
        max = 1,
        step = 0.01,
        label = '',
        showValue = false,
        formatValue = (v: number) => `${Math.round(v * 100)}%`,
    }: {
        value: number
        id?: string
        min?: number
        max?: number
        step?: number
        label?: string
        showValue?: boolean
        formatValue?: (v: number) => string
    } = $props()
</script>

<div class="range-slider">
    {#if label || showValue}
        <label for={id}>
            {label}{#if showValue}: {formatValue(value)}{/if}
        </label>
    {/if}
    <input type="range" {id} {min} {max} {step} bind:value />
</div>

<style>
    .range-slider {
        width: 100%;
    }

    label {
        display: block;
        margin-bottom: 0.5rem;
    }

    input[type='range'] {
        width: 100%;
        height: 0.5rem;
        appearance: none;
        background: var(--bg-3);
        border-radius: 0;
        cursor: pointer;
    }

    input[type='range']::-webkit-slider-thumb {
        appearance: none;
        width: 1rem;
        height: 1rem;
        background: var(--txt-2);
        border: none;
        cursor: pointer;
    }

    input[type='range']::-moz-range-thumb {
        width: 1rem;
        height: 1rem;
        background: var(--txt-2);
        border: none;
        cursor: pointer;
    }
</style>
