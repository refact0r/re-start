# re-start

a tui-style browser startpage, built with svelte.

features:

- todoist tasks integrationz
- weather (from open-meteo)
- customizable quick links
- stats (load time, ping, fps, viewport size)
- lightweight & performant (&lt;90kb including fonts, loads in &lt;50ms)

<img width="2331" height="1319" alt="image" src="https://github.com/user-attachments/assets/e3164af7-fc42-4caf-81ee-a049e05b84c7" />

## installation

### firefox

1. download the latest .xpi file from the `releases` folder.
2. go to the firefox extensions manager (`about:addons`)
3. click the gear icon in the top right.
4. click "Install Add-on From File" and select the .xpi file you downloaded.
5. make sure to click "Add" and "Keep Changes".

### chrome/edge

1. clone/download this repo.
2. run `npm i` (you must have node.js).
3. run `npm run build`. you should see it create a `dist` folder.
4. open the `manifest.json` file in `dist`.
5. delete these 3 lines from `manifest.json`:

```json
    "chrome_settings_overrides": {
        "homepage": "index.html"
    },
```

6. go to the chrome extensions manager (`chrome://extensions`).
7. turn on developer mode in the top right.
8. click "Load unpacked" in the top left.
9. select the `dist` folder.

### development / building from source

1. clone/download this repo.
2. run `npm i` (you must have node.js).
3. run `npm run dev` to start in development mode. the page will run at `http://localhost:5173`.
4. run `npm run build` to build for production.

## usage tips

- hover your cursor on the top right corner of the startpage, and you should see a settings button appear. click it to configure settings.
- to get your todoist api token, open the todoist website and click your profile in the top left. then go to "Settings" > "Integrations" > "Developer" > "Copy API Token".
- the 'x tasks' text is also a clickable link to todoist.
- you can force a refresh of the weather and todoist widgets by clicking the top left panel labels.
- the ping stat is based on how long a request to <https://www.google.com/generate_204> takes. don't take it too seriously.
- here's a matching [firefox color theme](https://color.firefox.com/?theme=XQAAAAK3BAAAAAAAAABBqYhm849SCicxcUhA3DJozHnOMuotJJDtxcajvY2nrbwtWf53IW6FuMhmsQBmHjQtYV0LyoGIJnESUiSA8WGCMfXU1SYqmE_CaU8iA8bQXAYc2jrXIT6bjoi8T-cSTCi2_9o7kcESfauVKnMZKEKJIeeuT9qsP4Z_T2ya4LBqvZWjm1-pHOmWMq1OU0wrgs4bkzHQWozn4dcm22eBmWyWR55FkcmEsPvvHzhHCZ2ZMQrPXQqrOBLr79GTkJUGa5oslhWTp2LYqdD2gNQ1a8_c5-F91bPVmQerXZWpp-OZ11D1Ai6t1ydqjbVKD3RrGXYJwhcQaAxCKa_ft4VoGrVBq8AXYeJOZdXuOxnYXGhOXXSK_NybBfJLm-2W28qSSdoiW0pTL-iFan3xQQeC0WlSrnRYrRjh7HkgLuI-Ft8Fq5kNC7nVXoo8j9Ml_q2AO_RhE116j_MECbspxaJP58juayX_wNty3V2g5zUsf0gSqpEWGT02oZAF2z6LABKRWTO28wIoMUDvj9WAQGsup95WAmNW7g4WMEIgaiJhmBz9koq0wV7gHQtJB_0x2lJ7WQ488bJi8LvqnW-VT3kZ3GJtyv-yXmRJ)!
