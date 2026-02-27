import { validSlugs } from './simple-icons-slugs.js'

// Map of URL hostname patterns to simple-icons slugs
const domainToSlug = {
    'mail.google.com': 'gmail',
    'calendar.google.com': 'googlecalendar',
    'drive.google.com': 'googledrive',
    'docs.google.com': 'googledocs',
    'keep.google.com': 'googlekeep',
    'maps.google.com': 'googlemaps',
    'photos.google.com': 'googlephotos',
    'meet.google.com': 'googlemeet',
    'sheets.google.com': 'googlesheets',
    'slides.google.com': 'googleslides',
    'translate.google.com': 'googletranslate',
    'aistudio.google.com': 'googlegemini',
    'claude.ai': 'claude',
    'x.com': 'x',
    'twitter.com': 'x',
    'github.com': 'github',
    'gitlab.com': 'gitlab',
    'reddit.com': 'reddit',
    'youtube.com': 'youtube',
    'music.youtube.com': 'youtubemusic',
    'twitch.tv': 'twitch',
    'discord.com': 'discord',
    'discord.gg': 'discord',
    'netflix.com': 'netflix',
    'spotify.com': 'spotify',
    'open.spotify.com': 'spotify',
    'amazon.com': 'amazon',
    'notion.so': 'notion',
    'figma.com': 'figma',
    'linkedin.com': 'linkedin',
    'facebook.com': 'facebook',
    'instagram.com': 'instagram',
    'threads.net': 'threads',
    'whatsapp.com': 'whatsapp',
    'web.whatsapp.com': 'whatsapp',
    'telegram.org': 'telegram',
    't.me': 'telegram',
    'medium.com': 'medium',
    'stackoverflow.com': 'stackoverflow',
    'wikipedia.org': 'wikipedia',
    'leetcode.com': 'leetcode',
    'perplexity.ai': 'perplexity',
    'feedly.com': 'feedly',
    'codepen.io': 'codepen',
    'vercel.com': 'vercel',
    'netlify.com': 'netlify',
    'heroku.com': 'heroku',
    'dropbox.com': 'dropbox',
    'trello.com': 'trello',
    'jira.atlassian.com': 'jira',
    'bitbucket.org': 'bitbucket',
    'npm.js.com': 'npm',
    'dev.to': 'devdotto',
    'hackernews.com': 'hackernews',
    'news.ycombinator.com': 'ycombinator',
    'producthunt.com': 'producthunt',
    'dribbble.com': 'dribbble',
    'behance.net': 'behance',
    'pinterest.com': 'pinterest',
    'tumblr.com': 'tumblr',
    'apple.com': 'apple',
    'icloud.com': 'icloud',
    'proton.me': 'proton',
    'mail.proton.me': 'protonmail',
    'bitwarden.com': 'bitwarden',
    'vault.bitwarden.com': 'bitwarden',
    'todoist.com': 'todoist',
    'linear.app': 'linear',
    'ray.so': 'raycast',
    'arc.net': 'arcbrowser',
    'brave.com': 'brave',
    'vivaldi.com': 'vivaldi',
}

export function isValidSlug(slug) {
    return validSlugs.has(slug)
}

export function guessIconSlug(url) {
    try {
        const hostname = new URL(url).hostname
        // exact match
        if (domainToSlug[hostname]) return domainToSlug[hostname]
        // strip www.
        const noWww = hostname.replace(/^www\./, '')
        if (domainToSlug[noWww]) return domainToSlug[noWww]
        // try base domain (last two parts)
        const parts = noWww.split('.')
        if (parts.length > 2) {
            const base = parts.slice(-2).join('.')
            if (domainToSlug[base]) return domainToSlug[base]
        }
        return null
    } catch {
        return null
    }
}
