(function() {
    const defaultTheme = 'default';
    try {
        const stored = localStorage.getItem('settings');
        let themeName = defaultTheme;
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.currentTheme) {
                themeName = parsed.currentTheme;
            }
        }
        document.documentElement.className = 'theme-' + themeName;
    } catch (e) {
        document.documentElement.className = 'theme-' + defaultTheme;
    }
})();
