// Background service worker
const AIAI_URL = 'https://yt-analysis-tool-mu.vercel.app'

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== 'OPEN_AIAI') return

  chrome.storage.local.set({ aiai_pending: msg.data }, () => {
    chrome.tabs.query({ url: AIAI_URL + '/*' }, (tabs) => {
      if (tabs.length > 0) {
        const tab = tabs[0]
        chrome.tabs.update(tab.id, { active: true })
        chrome.windows.update(tab.windowId, { focused: true })
        // visibilitychange in auth.js will detect and process aiai_pending
      } else {
        chrome.tabs.create({ url: AIAI_URL })
      }
    })
  })
})
