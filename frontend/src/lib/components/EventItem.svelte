<script lang="ts">
    import { MapPin, Video } from 'lucide-svelte'
    import { ListItem, Text, Link, Column, Row, Icon } from './ui'

    type VideoProvider = 'meet' | 'teams' | 'zoom' | 'other' | null

    let {
        time,
        title,
        href,
        location,
        videoLink,
        videoProvider,
        past = false,
        ongoing = false,
    }: {
        time: string
        title: string
        href: string
        location?: string | null
        videoLink?: string | null
        videoProvider?: VideoProvider
        past?: boolean
        ongoing?: boolean
    } = $props()
</script>

<ListItem faded={past} align="start" marginBottom>
    <Text color={ongoing ? 'accent' : 'secondary'} shrink={false} minWidth="7ch"
        >{time}</Text
    >
    <Column gap="none" flex={1}>
        <Link {href} target="_blank">{title}</Link>
        {#if location || videoProvider}
            <Column gap="none">
                {#if location}
                    <Row gap="xs" align="center">
                        <Text size="sm" color="muted">
                            <Icon size={12}><MapPin size={12} /></Icon>
                            {location}
                        </Text>
                    </Row>
                {/if}
                {#if videoProvider && videoLink}
                    <Link href={videoLink} target="_blank">
                        <Text size="sm" color="muted">
                            <Row gap="xs" align="center">
                                {#if videoProvider === 'meet'}
                                    <Icon size={14}>
                                        <svg
                                            viewBox="0 0 50 50"
                                            fill="currentColor"
                                        >
                                            <path
                                                d="M2 18L2 32 12 32 12 18zM39 9v4.31l-10 9V16H14V6h22C37.66 6 39 7.34 39 9zM29 27.69l10 9V41c0 1.66-1.34 3-3 3H14V34h15V27.69zM12 34v10H5c-1.657 0-3-1.343-3-3v-7H12zM12 6L12 16 2 16zM29 25L39 16 39 34zM49 9.25v31.5c0 .87-1.03 1.33-1.67.75L41 35.8V14.2l6.33-5.7C47.97 7.92 49 8.38 49 9.25z"
                                            />
                                        </svg>
                                    </Icon>
                                    Meet
                                {:else if videoProvider === 'teams'}
                                    <Icon size={14}>
                                        <svg
                                            viewBox="0 0 50 50"
                                            fill="currentColor"
                                        >
                                            <path
                                                d="M 27.5 5 C 24.08 5 21.269531 7.64 21.019531 11 L 24 11 C 26.76 11 29 13.24 29 16 L 29 17.820312 C 31.87 17.150312 34 14.57 34 11.5 C 34 7.91 31.09 5 27.5 5 z M 42.5 9 A 4.5 4.5 0 0 0 42.5 18 A 4.5 4.5 0 0 0 42.5 9 z M 6 13 C 4.346 13 3 14.346 3 16 L 3 34 C 3 35.654 4.346 37 6 37 L 24 37 C 25.654 37 27 35.654 27 34 L 27 16 C 27 14.346 25.654 13 24 13 L 6 13 z M 10 19 L 20 19 L 20 21 L 16 21 L 16 31 L 14 31 L 14 21 L 10 21 L 10 19 z M 29 21 L 29 34 C 29 36.76 26.76 39 24 39 L 18.199219 39 C 18.599219 40.96 19.569688 42.710313 20.929688 44.070312 C 22.739688 45.880312 25.24 47 28 47 C 33.52 47 38 42.52 38 37 L 38 21 L 29 21 z M 40 21 L 40 37 C 40 37.82 39.919531 38.620625 39.769531 39.390625 C 40.599531 39.780625 41.52 40 42.5 40 C 46.09 40 49 37.09 49 33.5 L 49 21 L 40 21 z"
                                            />
                                        </svg>
                                    </Icon>
                                    Teams
                                {:else if videoProvider === 'zoom'}
                                    <Icon size={14}>
                                        <svg
                                            viewBox="0 0 50 50"
                                            fill="currentColor"
                                        >
                                            <path
                                                d="M33.619,4H16.381C9.554,4,4,9.554,4,16.381v17.238C4,40.446,9.554,46,16.381,46h17.238C40.446,46,46,40.446,46,33.619	V16.381C46,9.554,40.446,4,33.619,4z M30,30.386C30,31.278,29.278,32,28.386,32H15.005C12.793,32,11,30.207,11,27.995v-9.382	C11,17.722,11.722,17,12.614,17h13.382C28.207,17,30,18.793,30,21.005V30.386z M39,30.196c0,0.785-0.864,1.264-1.53,0.848l-5-3.125	C32.178,27.736,32,27.416,32,27.071v-5.141c0-0.345,0.178-0.665,0.47-0.848l5-3.125C38.136,17.54,39,18.019,39,18.804V30.196z"
                                            />
                                        </svg>
                                    </Icon>
                                    Zoom
                                {:else}
                                    <Icon size={12}><Video size={12} /></Icon>
                                    Meeting
                                {/if}
                            </Row>
                        </Text>
                    </Link>
                {/if}
            </Column>
        {/if}
    </Column>
</ListItem>
