chrome.runtime.onInstalled.addListener(async () => {
    for (const id of ['github']) {
        await chrome.contextMenus.create({
            title: chrome.i18n.getMessage(id),
            id,
            contexts: ["action"]
        })
    }
})

chrome.contextMenus.onClicked.addListener(async (req, ...rest)=>{
    switch (req.menuItemId) {
        case 'github': {
            await chrome.tabs.create({url: 'https://github.com/olton/mina-status-chrome-ext'})
            break
        }
    }
})