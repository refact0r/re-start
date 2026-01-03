<script lang="ts">
    let {
        colors = [],
        size = 'md',
        rounded = false,
    }: {
        colors: string[]
        size?: 'sm' | 'md' | 'lg'
        rounded?: boolean
    } = $props()
</script>

<span class="swatch size-{size}" class:rounded>
    {#each colors as color, index (index)}
        <span class="color" style:background-color={color}></span>
    {/each}
</span>

<style>
    .swatch {
        display: inline-flex;
        vertical-align: middle;
        border: 2px solid var(--bg-3);
    }

    .swatch.rounded {
        border-radius: 2px;
        border: none;
    }

    .color {
        display: block;
    }

    .size-sm .color {
        width: 0.75rem;
        height: 0.75rem;
    }

    .size-md .color {
        width: 1rem;
        height: 1rem;
    }

    .size-lg .color {
        width: 1.25rem;
        height: 1.25rem;
    }
</style>
