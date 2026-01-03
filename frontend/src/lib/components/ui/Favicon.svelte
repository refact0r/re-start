<script lang="ts">
    let {
        url,
    }: {
        url: string
    } = $props()

    const FAVICON_OVERRIDES: Record<string, string> = {
        'mail.google.com':
            'https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico',
        'calendar.google.com':
            'https://calendar.google.com/googlecalendar/images/favicons_2020q4/calendar_31.ico',
        'drive.google.com':
            'https://ssl.gstatic.com/docs/doclist/images/drive_2022q3_32dp.png',
        'docs.google.com':
            'https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico',
        'keep.google.com': 'https://ssl.gstatic.com/keep/icon_2020q4v2_128.png',
    }

    function getFaviconUrl(url: string): string {
        try {
            const domain = new URL(url).hostname
            if (FAVICON_OVERRIDES[domain]) {
                return FAVICON_OVERRIDES[domain]
            }
            return `https://icons.duckduckgo.com/ip3/${domain}.ico`
        } catch {
            return ''
        }
    }

    const src = $derived(getFaviconUrl(url))
</script>

{#if src}
    <img {src} alt="" class="favicon" />
{/if}

<style>
    .favicon {
        width: 16px;
        height: 16px;
        opacity: 0.7;
    }

    :global(a:hover) .favicon {
        opacity: 1;
    }
</style>
