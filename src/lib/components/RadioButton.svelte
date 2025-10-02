<script>
    let { group = $bindable(), value, children } = $props()

    let isChecked = $derived(group === value)
</script>

<label>
    <input type="radio" bind:group {value} />
    <span class="radio-indicator" class:checked={isChecked}>
        {isChecked ? 'x' : ' '}
    </span>
    <span class="radio-content">
        {@render children?.()}
    </span>
</label>

<style>
    label {
        display: block;
        cursor: pointer;
    }

    label input[type='radio'] {
        display: none;
    }

    .radio-indicator {
        color: var(--txt-1);
    }

    .radio-indicator::before {
        content: '[';
        color: var(--txt-3);
    }

    .radio-indicator::after {
        content: ']';
        color: var(--txt-3);
    }

    label:hover {
        .radio-indicator::before,
        .radio-indicator::after {
            color: var(--txt-2);
        }
    }
</style>
