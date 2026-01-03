<script lang="ts">
    import type { Snippet } from 'svelte'

    let {
        label,
        clickableLabel = false,
        onLabelClick,
        children,
        span,
        flex,
        flexShrink,
        noFade = false,
        noPaddingBottom = false,
    }: {
        label: string
        clickableLabel?: boolean
        onLabelClick?: () => void
        children: Snippet
        span?: number
        flex?: number | string
        flexShrink?: number
        noFade?: boolean
        noPaddingBottom?: boolean
    } = $props()

    const wrapperStyle = $derived(
        [
            span ? `grid-column: span ${span}` : '',
            flex !== undefined ? `flex: ${flex}` : '',
            flexShrink !== undefined ? `flex-shrink: ${flexShrink}` : '',
        ]
            .filter(Boolean)
            .join('; ')
    )
</script>

<div class="panel-wrapper" style={wrapperStyle || undefined}>
    {#if clickableLabel}
        <button class="panel-label clickable" onclick={onLabelClick}>
            {label}
        </button>
    {:else}
        <div class="panel-label">{label}</div>
    {/if}
    <div
        class="panel"
        class:no-fade={noFade}
        class:no-padding-bottom={noPaddingBottom}
    >
        {@render children()}
    </div>
</div>

<style>
    .panel-wrapper {
        position: relative;
        min-width: 0;
        display: flex;
    }

    .panel-wrapper::before {
        content: '';
        position: absolute;
        inset: 0;
        background: var(--bg-1);
        z-index: 0;
    }

    :global(body.has-background) .panel-wrapper::before {
        background: color-mix(in oklch, var(--bg-1) 80%, transparent);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
    }

    .panel {
        position: relative;
        z-index: 1;
        padding: 1.5rem;
        padding-bottom: 0;
        overflow: hidden;
        width: 100%;
        overflow-y: auto;
        mask-image: linear-gradient(
            to bottom,
            black 0%,
            black calc(100% - 3rem),
            transparent 100%
        );
        -webkit-mask-image: linear-gradient(
            to bottom,
            black 0%,
            black calc(100% - 3rem),
            transparent 100%
        );
    }

    .panel.no-fade {
        mask-image: none;
        -webkit-mask-image: none;
    }

    .panel.no-padding-bottom {
        padding-bottom: 1.5rem;
    }

    .panel-label {
        position: absolute;
        top: -12px;
        left: 10px;
        background-color: var(--bg-1);
        color: var(--txt-4);
        padding: 0 4px;
        z-index: 10;
    }

    :global(body.has-background) .panel-label {
        background: color-mix(in oklch, var(--bg-1) 80%, transparent);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        color: var(--txt-2);
    }

    .panel-label.clickable {
        cursor: pointer;
    }

    .panel-label.clickable:hover {
        color: var(--txt-3);
    }

    :global(body.has-background) .panel-label.clickable:hover {
        color: var(--txt-1);
    }
</style>
