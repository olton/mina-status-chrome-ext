globalThis.webSocket = null

const isOpen = (ws) => ws && ws.readyState === ws.OPEN

const connect = () => {
    const ws = new WebSocket(`wss://minataur.net`)

    globalThis.webSocket = ws

    ws.onmessage = event => {
        try {
            const content = JSON.parse(event.data)
            if (typeof globalThis["wsController"] === 'function') {
                globalThis["wsController"].apply(null, [ws, content])
            }
        } catch (e) {
            console.error(e.message)
        }
    }

    ws.onerror = error => {
        error('Socket encountered error: ', error.message, 'Closing socket');
        ws.close();
    }

    ws.onclose = event => {
        console.log('Socket is closed. Reconnect will be attempted in 1 second.', event.reason);
        setTimeout(connect, 1000)
    }

    ws.onopen = event => {
        console.log('Connected to Minataur, wait for welcome message!');
    }
}

const request = (channel, data, ws = globalThis.webSocket) => {
    if (isOpen(ws)) {
        ws.send(JSON.stringify({channel, data}));
    }
}
