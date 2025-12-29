export const themes = {
    default: {
        displayName: 'default',
        colors: {
            '--bg-1': 'oklch(19% 0 0)',
            '--bg-2': 'oklch(23% 0 0)',
            '--bg-3': 'oklch(27% 0 0)',
            '--txt-1': 'oklch(90% 0 0)',
            '--txt-2': 'oklch(75% 0 0)',
            '--txt-3': 'oklch(50% 0 0)',
            '--txt-4': 'oklch(40% 0 0)',
            '--txt-err': 'oklch(70% 0.11 0)',
        },
    },
    'rose-pine': {
        displayName: 'rosé pine',
        colors: {
            '--bg-1': '#191724',
            '--bg-2': '#1f1d2e',
            '--bg-3': '#26233a',
            '--txt-1': '#e0def4',
            '--txt-2': 'hsl(248, 25%, 75%)',
            '--txt-3': '#31748f',
            '--txt-4': '#ebbcba',
            '--txt-err': '#eb6f92',
        },
    },
    'catppuccin-mocha': {
        displayName: 'catppuccin mocha',
        colors: {
            '--bg-1': '#181825',
            '--bg-2': '#1e1e2e',
            '--bg-3': '#313244',
            '--txt-1': '#cdd6f4',
            '--txt-2': '#a6adc8',
            '--txt-3': '#6c7086',
            '--txt-4': '#cba6f7',
            '--txt-err': '#f38ba8',
        },
    },
    'catppuccin-latte': {
        displayName: 'catppuccin latte',
        colors: {
            '--bg-1': '#eff1f5',
            '--bg-2': '#dce0e8',
            '--bg-3': '#ccd0da',
            '--txt-1': 'hsl(234, 16%, 20%)',
            '--txt-2': '#4c4f69',
            '--txt-3': '#8c8fa1',
            '--txt-4': '#7287fd',
            '--txt-err': '#d20f39',
        },
    },
    nord: {
        displayName: 'nord',
        colors: {
            '--bg-1': '#2e3440',
            '--bg-2': '#3b4252',
            '--bg-3': '#434c5e',
            '--txt-1': '#eceff4',
            '--txt-2': '#d8dee9',
            '--txt-3': 'hsl(219, 23%, 65%)',
            '--txt-4': '#88c0d0',
            '--txt-err': '#bf616a',
        },
    },
    'tokyo-night': {
        displayName: 'tokyo night',
        colors: {
            '--bg-1': '#1a1b26',
            '--bg-2': '#24283b',
            '--bg-3': 'hsl(230, 24%, 21%)',
            '--txt-1': '#c0caf5',
            '--txt-2': '#a9b1d6',
            '--txt-3': '#565f89',
            '--txt-4': '#7aa2f7',
            '--txt-err': '#f7768e',
        },
    },
    gruvbox: {
        displayName: 'gruvbox',
        colors: {
            '--bg-1': '#282828',
            '--bg-2': '#3c3836',
            '--bg-3': '#504945',
            '--txt-1': '#ebdbb2',
            '--txt-2': '#d5c4a1',
            '--txt-3': '#928374',
            '--txt-4': '#fabd2f',
            '--txt-err': '#fb4934',
        },
    },
    everforest: {
        displayName: 'everforest',
        colors: {
            '--bg-1': '#272e33',
            '--bg-2': '#2e383c',
            '--bg-3': '#374145',
            '--txt-1': '#d3c6aa',
            '--txt-2': 'hsl(41, 20%, 65%)',
            '--txt-3': '#7a8478',
            '--txt-4': '#a7c080',
            '--txt-err': '#e67e80',
        },
    },
}

export const themeNames = Object.keys(themes)

export const defaultTheme = 'default'
