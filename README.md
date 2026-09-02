# re-start

a tui-style browser startpage, built with svelte.

features:

- task list with multiple backend options (local, todoist, google tasks (chrome only), microsoft todo (chrome only))
- smart task input with natural date and project parsing
- weather summary (from open-meteo)
- customizable quick links with icons
- stats (load time, ping, fps, viewport size)
- multiple color themes
- custom css support
- performant & lightweight (loads in <50ms)

<img alt="screenshot" src="files/screenshot.png" />

## installation

### firefox

1. go to <https://addons.mozilla.org/en-US/firefox/addon/d004c62a8aed4f3b8ddd/>.
2. click "Add to Firefox".
3. make sure to click "Add" and "Keep Changes" when prompted.

### chrome/edge

1. go to <https://chromewebstore.google.com/detail/re-start/fdodcmjeojbmcgmhcgcelffcekhicnop>.
2. click "Add to [Browser]".
3. make sure to click "Add extension" and "Keep it" when prompted.

## usage tips/info

- settings
  - hover over the top right corner to see the settings button.
  - to get your todoist api token, go to <https://app.todoist.com/app/settings/integrations/developer>.
  - drag the "=" to reorder links in the settings.
- tasks
  - you can force refresh the task/weather widgets by clicking the top left panel labels
  - the 'x tasks' text is a clickable link to the current backend web app:
    - todoist: <https://app.todoist.com/app>
    - google tasks: <https://tasks.google.com>
    - microsoft todo: <https://to-do.office.com/tasks/>
  - when adding tasks, you can add due dates by typing naturally like "tmrw", "friday", "dec 25", "jan 1 3pm", etc.
  - assign tasks to projects/lists by typing `#projectname` anywhere in the task input.
  - completed tasks are hidden after 5 minutes.
- the ping stat measures how long a request to <https://www.google.com/generate_204> takes. don't take it too seriously.
- here's a matching [firefox color theme](https://color.firefox.com/?theme=XQAAAAK3BAAAAAAAAABBqYhm849SCicxcUhA3DJozHnOMuotJJDtxcajvY2nrbwtWf53IW6FuMhmsQBmHjQtYV0LyoGIJnESUiSA8WGCMfXU1SYqmE_CaU8iA8bQXAYc2jrXIT6bjoi8T-cSTCi2_9o7kcESfauVKnMZKEKJIeeuT9qsP4Z_T2ya4LBqvZWjm1-pHOmWMq1OU0wrgs4bkzHQWozn4dcm22eBmWyWR55FkcmEsPvvHzhHCZ2ZMQrPXQqrOBLr79GTkJUGa5oslhWTp2LYqdD2gNQ1a8_c5-F91bPVmQerXZWpp-OZ11D1Ai6t1ydqjbVKD3RrGXYJwhcQaAxCKa_ft4VoGrVBq8AXYeJOZdXuOxnYXGhOXXSK_NybBfJLm-2W28qSSdoiW0pTL-iFan3xQQeC0WlSrnRYrRjh7HkgLuI-Ft8Fq5kNC7nVXoo8j9Ml_q2AO_RhE116j_MECbspxaJP58juayX_wNty3V2g5zUsf0gSqpEWGT02oZAF2z6LABKRWTO28wIoMUDvj9WAQGsup95WAmNW7g4WMEIgaiJhmBz9koq0wV7gHQtJB_0x2lJ7WQ488bJi8LvqnW-VT3kZ3GJtyv-yXmRJ)!

## microsoft todo setup (chrome only)

1. create a microsoft entra app registration (single-page/public client is fine for this extension flow).
2. add delegated microsoft graph permissions:
   - `Tasks.ReadWrite`
   - `offline_access`
   - `openid`
   - `profile`
3. add redirect uri:
   - `https://<extension-id>.chromiumapp.org/microsoft`
   - you can get `<extension-id>` after loading the extension in chrome.
4. in re-start settings:
   - set task backend to `microsoft todo`
   - paste `microsoft client id` (application/client id from app registration)
   - optionally set `microsoft tenant` (`common` by default)
   - click `[sign in with microsoft]`

notes:
- `common` allows personal + organizational microsoft accounts (if your app registration supports both).
- this backend currently targets chrome/edge only because it uses `chrome.identity.launchWebAuthFlow`.

## development / build from source

1. clone this repo.
2. run `npm i` (you must have node.js).
3. run `npm run dev` to run just the webpage in dev mode at `http://localhost:5173`.
4. run `npm run watch` to build the extension and watch for changes. this can be used with `web-ext run` to test in firefox.
5. run `npm run build:firefox` or `npm run build:chrome:prod` to build for production. the built extension will output to `dist/firefox` or `dist/chrome` respectively.
