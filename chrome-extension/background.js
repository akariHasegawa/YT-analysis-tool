// Background service worker
// Handles opening/focusing the AIAI-short tab and forwarding pending data

const AIAI_URL = 'https://yt-analysis-tool-mu.vercel.app'

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type !== 'OPEN_AIAI') return

  chrome.storage.local.set({ aiai_pending: msg.data }, () => {
    chrome.tabs.query({ url: AIAI_URL + '/*' }, (tabs) => {
      if (tabs.length > 0) {
        // Existing AIAI-short tab found — focus it and notify content script
        const tab = tabs[0]
        chrome.tabs.update(tab.id, { active: true })
        chrome.windows.update(tab.windowId, { focused: true })
        // Notify auth.js in that tab to forward pending data to the page
        setTimeout(() => {
          chrome.tabs.sendMessage(tab.id, { type: 'AIAI_CHECK_PENDING' }).catch(() => {})
        }, 300)
      } else {
        // No existing tab — open new one
        chrome.tabs.create({ url: AIAI_URL })
      }
    })
  })
})
