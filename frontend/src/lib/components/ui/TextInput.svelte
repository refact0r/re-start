<script lang="ts">
    let {
        value = $bindable(),
        id = '',
        placeholder = '',
        type = 'text',
        size = 'md',
        width = 'full',
        variant = 'default',
    }: {
        value: string
        id?: string
        placeholder?: string
        type?: 'text' | 'password' | 'email' | 'url'
        size?: 'sm' | 'md'
        width?: 'full' | 'sm' | 'md' | 'lg'
        variant?: 'default' | 'light'
    } = $props()
</script>

<input
    {type}
    {id}
    {placeholder}
    bind:value
    class="text-input size-{size} width-{width} variant-{variant}"
/>

<style>
    .text-input {
        padding: 0.5rem;
        border: 2px solid var(--bg-3);
        color: inherit;
        font: inherit;
        outline: none;
    }

    .text-input:focus {
        border-color: var(--txt-3);
    }

    .variant-default {
        background: var(--bg-2);
    }
    .variant-light {
        background: var(--bg-1);
        border-width: 1px;
    }

    .size-sm {
        padding: 0.375rem 0.5rem;
    }
    .size-md {
        padding: 0.5rem;
    }

    .width-full {
        width: 100%;
    }
    .width-sm {
        width: 8rem;
    }
    .width-md {
        width: 10rem;
    }
    .width-lg {
        width: 16rem;
    }
</style>
