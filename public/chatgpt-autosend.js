;(() => {
    try {
        const url = new URL(window.location.href)
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''))
        const searchParams = new URLSearchParams(url.search)
        const param = (key) => searchParams.get(key) ?? hashParams.get(key)

        const shouldAutosend = param('restart_autosend') === '1'
        const requestId = param('restart_request') || ''
        const prompt = param('restart_prompt') || ''

        if (!shouldAutosend || !requestId || !prompt.trim()) return

        const normalizedPrompt = prompt.trim()
        const handledKey = `restart-autosend:${requestId}`
        const existingStatus = sessionStorage.getItem(handledKey)
        if (existingStatus === 'started' || existingStatus === 'sent') {
            cleanupUrl()
            return
        }
        sessionStorage.setItem(handledKey, 'started')

        let done = false
        let sendAttempted = false
        let fallbackUsed = false
        let attempts = 0
        const maxAttempts = 120
        let intervalId = null
        let observer = null

        window.__restartAutosendState = {
            active: true,
            sent: false,
            attempts: 0,
            reason: 'starting',
        }

        function isVisible(element) {
            if (!element) return false
            return element.getClientRects().length > 0
        }

        function cleanupUrl() {
            const nextUrl = new URL(window.location.href)
            nextUrl.searchParams.delete('restart_autosend')
            nextUrl.searchParams.delete('restart_request')
            nextUrl.searchParams.delete('restart_prompt')

            const nextHashParams = new URLSearchParams(
                nextUrl.hash.replace(/^#/, '')
            )
            nextHashParams.delete('restart_autosend')
            nextHashParams.delete('restart_request')
            nextHashParams.delete('restart_prompt')
            const nextHash = nextHashParams.toString()
            nextUrl.hash = nextHash ? `#${nextHash}` : ''
            history.replaceState({}, '', nextUrl.toString())
        }

        function findEditor() {
            const selectors = [
                'textarea#prompt-textarea',
                'textarea[data-testid="prompt-textarea"]',
                'textarea[placeholder*="Message"]',
                '[contenteditable="true"][data-testid="prompt-textarea"]',
                'div[contenteditable="true"][role="textbox"]',
                'div.ProseMirror[contenteditable="true"]',
            ]

            for (const selector of selectors) {
                const matches = document.querySelectorAll(selector)
                for (const match of matches) {
                    if (isVisible(match)) return match
                }
            }

            return null
        }

        function findSendButton() {
            const selectors = [
                'button[data-testid="send-button"]',
                'button[data-testid="fruitjuice-send-button"]',
                'button[aria-label="Send prompt"]',
                'button[aria-label*="Send"]',
                'button[data-testid*="send"]',
                'form button[type="submit"]',
            ]

            for (const selector of selectors) {
                const matches = document.querySelectorAll(selector)
                for (const button of matches) {
                    const disabled =
                        button.disabled ||
                        button.getAttribute('aria-disabled') === 'true'
                    if (!disabled && isVisible(button)) {
                        return button
                    }
                }
            }

            return null
        }

        function findStopButton() {
            return (
                document.querySelector('button[data-testid="stop-button"]') ||
                document.querySelector('button[aria-label*="Stop"]')
            )
        }

        function setTextareaValue(textarea, text) {
            const descriptor = Object.getOwnPropertyDescriptor(
                window.HTMLTextAreaElement.prototype,
                'value'
            )
            const setter = descriptor?.set
            if (setter) {
                setter.call(textarea, text)
            } else {
                textarea.value = text
            }
            textarea.dispatchEvent(new Event('input', { bubbles: true }))
            textarea.dispatchEvent(new Event('change', { bubbles: true }))
        }

        function setContentEditableValue(editor, text) {
            editor.focus()

            const selection = window.getSelection()
            if (selection) {
                const range = document.createRange()
                range.selectNodeContents(editor)
                range.collapse(false)
                selection.removeAllRanges()
                selection.addRange(range)
            }

            // execCommand is deprecated, but still works in most extension contexts
            // and is more compatible with React/ProseMirror editors.
            const inserted = document.execCommand('insertText', false, text)
            if (!inserted) {
                editor.textContent = text
            }

            editor.dispatchEvent(
                new InputEvent('input', {
                    bubbles: true,
                    data: text,
                    inputType: 'insertText',
                })
            )
        }

        function setPrompt(editor, text) {
            if (editor instanceof HTMLTextAreaElement) {
                setTextareaValue(editor, text)
                return
            }

            if (editor.getAttribute('contenteditable') === 'true') {
                setContentEditableValue(editor, text)
            }
        }

        function editorText(editor) {
            if (!editor) return ''
            if (editor instanceof HTMLTextAreaElement) {
                return editor.value || ''
            }
            return editor.textContent || ''
        }

        function isDisabledButton(button) {
            return (
                !button ||
                button.disabled ||
                button.getAttribute('aria-disabled') === 'true'
            )
        }

        function setState(reason, sent) {
            window.__restartAutosendState = {
                active: !done,
                sent,
                attempts,
                reason,
            }
        }

        function sendViaEnter(editor) {
            editor.dispatchEvent(
                new KeyboardEvent('keydown', {
                    key: 'Enter',
                    code: 'Enter',
                    which: 13,
                    keyCode: 13,
                    bubbles: true,
                    cancelable: true,
                })
            )
            editor.dispatchEvent(
                new KeyboardEvent('keypress', {
                    key: 'Enter',
                    code: 'Enter',
                    which: 13,
                    keyCode: 13,
                    bubbles: true,
                    cancelable: true,
                })
            )
            editor.dispatchEvent(
                new KeyboardEvent('keyup', {
                    key: 'Enter',
                    code: 'Enter',
                    which: 13,
                    keyCode: 13,
                    bubbles: true,
                    cancelable: true,
                })
            )
        }

        function stop(reason, sent) {
            if (done) return
            done = true
            sessionStorage.setItem(handledKey, sent ? 'sent' : 'failed')
            cleanupUrl()
            if (intervalId) clearInterval(intervalId)
            if (observer) observer.disconnect()
            setState(reason, sent)
        }

        function sendOnce(editor, sendButton) {
            sendAttempted = true
            if (observer) observer.disconnect()
            if (intervalId) clearInterval(intervalId)

            setState('send-clicked', false)
            sendButton.click()

            setTimeout(() => {
                if (done) return

                const liveEditor = findEditor()
                const textNow = editorText(liveEditor).trim()
                const stopButton = findStopButton()

                if (
                    isVisible(stopButton) ||
                    textNow === '' ||
                    textNow !== normalizedPrompt
                ) {
                    stop('sent', true)
                    return
                }

                if (!fallbackUsed && liveEditor) {
                    fallbackUsed = true
                    setState('fallback-enter', false)
                    sendViaEnter(liveEditor)

                    setTimeout(() => {
                        if (done) return
                        const liveEditor2 = findEditor()
                        const textNow2 = editorText(liveEditor2).trim()
                        const stopButton2 = findStopButton()
                        if (
                            isVisible(stopButton2) ||
                            textNow2 === '' ||
                            textNow2 !== normalizedPrompt
                        ) {
                            stop('sent', true)
                            return
                        }
                        stop('failed-no-send', false)
                    }, 700)
                    return
                }

                stop('failed-no-send', false)
            }, 650)
        }

        function trySend() {
            if (done || sendAttempted) return false

            const editor = findEditor()
            if (!editor) {
                setState('editor-not-found', false)
                return false
            }

            setPrompt(editor, prompt)
            editor.focus()
            setState('prompt-inserted', false)

            const sendButton = findSendButton()
            if (!sendButton || isDisabledButton(sendButton)) {
                setState('send-button-not-ready', false)
                return false
            }

            sendOnce(editor, sendButton)
            return true
        }

        intervalId = setInterval(() => {
            if (done || sendAttempted) return
            attempts += 1
            setState('waiting', false)
            window.__restartAutosendState.attempts = attempts
            trySend()

            if (!done && !sendAttempted && attempts >= maxAttempts) {
                stop('timed-out', false)
            }
        }, 250)

        observer = new MutationObserver(() => {
            if (done || sendAttempted) return
            trySend()
        })

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
        })
    } catch (error) {
        console.error('chatgpt autosend failed:', error)
    }
})()
