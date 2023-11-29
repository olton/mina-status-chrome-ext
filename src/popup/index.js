const UPDATE_INTERVAL = 30000

globalThis.wsController = (ws, res) => {
    const {channel, data} = res
    switch (channel) {
        case 'welcome': {
            request('price')
            request('epoch')
            request('last_block')
            break
        }
        case 'price': {
            updatePrice(data)
            setTimeout(request, UPDATE_INTERVAL, 'price')
            break
        }
        case 'epoch': {
            updateEpoch(data)
            setTimeout(request, UPDATE_INTERVAL, 'epoch')
            break
        }
        case 'last_block': {
            updateBlock(data)
            setTimeout(request, UPDATE_INTERVAL, 'last_block')
            break
        }
        case 'new_block': {
            request('price')
            request('epoch')
            request('last_block')
        }
    }
}

window.addEventListener("load", ()=>{
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const id = el.getAttribute('data-i18n')
        el.innerHTML = chrome.i18n.getMessage(id)
    })

    connect()
})