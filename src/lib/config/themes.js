// Theme metadata
// Actual theme CSS is in themes.css and inlined at build time
// Preview colors are used for the theme selector UI

export const themes = {
    default: {
        displayName: 'default',
        preview: {
            bg: 'oklch(19% 0 0)',
            accent: 'oklch(40% 0 0)',
            text: 'oklch(75% 0 0)',
        },
    },
    'rose-pine': {
        displayName: 'rosé pine',
        preview: {
            bg: '#191724',
            accent: '#ebbcba',
            text: 'hsl(248, 25%, 75%)',
        },
    },
    'catppuccin-mocha': {
        displayName: 'catppuccin mocha',
        preview: {
            bg: '#181825',
            accent: '#cba6f7',
            text: '#a6adc8',
        },
    },
    'catppuccin-latte': {
        displayName: 'catppuccin latte',
        preview: {
            bg: '#eff1f5',
            accent: '#7287fd',
            text: '#4c4f69',
        },
    },
    nord: {
        displayName: 'nord',
        preview: {
            bg: '#2e3440',
            accent: '#88c0d0',
            text: '#d8dee9',
        },
    },
    'tokyo-night': {
        displayName: 'tokyo night',
        preview: {
            bg: '#1a1b26',
            accent: '#7aa2f7',
            text: '#a9b1d6',
        },
    },
    gruvbox: {
        displayName: 'gruvbox',
        preview: {
            bg: '#282828',
            accent: '#fabd2f',
            text: '#d5c4a1',
        },
    },
    everforest: {
        displayName: 'everforest',
        preview: {
            bg: '#272e33',
            accent: '#a7c080',
            text: 'hsl(41, 20%, 65%)',
        },
    },
    kanagawa: {
        displayName: 'kanagawa',
        preview: {
            bg: '#1F1F28',
            accent: '#957FB8',
            text: '#C8C093',
        },
    },
}

export const themeNames = Object.keys(themes)

export const defaultTheme = 'default'
