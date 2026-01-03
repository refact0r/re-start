<script lang="ts">
    let {
        value = $bindable(),
        id = '',
        step = '1',
        min,
        max,
    }: {
        value: number | null
        id?: string
        step?: string
        min?: number
        max?: number
    } = $props()
</script>

<input type="number" {id} {step} {min} {max} bind:value class="number-input" />

<style>
    .number-input {
        width: 100%;
        padding: 0.5rem;
        background: var(--bg-2);
        border: 2px solid var(--bg-3);
        color: inherit;
        font: inherit;
        outline: none;
    }

    .number-input:focus {
        border-color: var(--txt-3);
    }
</style>
