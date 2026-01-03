<script lang="ts">
    import type { ParsedDate } from '../types'
    import { HighlightInput } from './ui'

    let {
        value = $bindable(''),
        parsed = $bindable(null),
        placeholder = 'new task',
        disabled = false,
        loading = false,
        show = false,
        onsubmit,
        oninput,
    }: {
        value: string
        parsed: ParsedDate | null
        placeholder?: string
        disabled?: boolean
        loading?: boolean
        show?: boolean
        onsubmit?: (event: SubmitEvent) => void
        oninput?: (value: string) => void
    } = $props()

    const match = $derived(parsed?.match ?? null)
</script>

<HighlightInput
    bind:value
    {match}
    {placeholder}
    disabled={disabled || loading}
    prefix="+"
    {show}
    {onsubmit}
    {oninput}
/>
