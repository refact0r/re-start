<script lang="ts">
    let {
        value = $bindable(),
        id = '',
        placeholder = '',
        rows = 6,
    }: {
        value: string
        id?: string
        placeholder?: string
        rows?: number
    } = $props()
</script>

<textarea {id} {placeholder} {rows} bind:value class="textarea"></textarea>

<style>
    .textarea {
        width: 100%;
        padding: 0.5rem;
        background: var(--bg-2);
        border: 2px solid var(--bg-3);
        resize: vertical;
        font-family: var(--font-family);
        font-size: 0.875rem;
        min-height: 6rem;
        color: inherit;
        outline: none;
    }

    .textarea:focus {
        border-color: var(--txt-3);
    }

    .textarea::placeholder {
        color: var(--txt-3);
    }
</style>
