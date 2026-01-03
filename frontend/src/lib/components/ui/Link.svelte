<script lang="ts">
    import type { Snippet } from 'svelte'

    let {
        href,
        target = '_self',
        children,
    }: {
        href: string
        target?: '_self' | '_blank'
        children: Snippet
    } = $props()
</script>

<a
    {href}
    {target}
    rel={target === '_blank' ? 'noopener noreferrer' : undefined}
    class="link"
>
    {@render children()}
</a>

<style>
    .link {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        color: inherit;
        text-decoration: none;
    }

    .link:hover {
        color: var(--txt-1);
    }
</style>
