// Background service worker
const AIAI_URL = 'https://yt-analysis-tool-mu.vercel.app'

chrome.runtime.onMessage.addListener((msg) => {
  // 単体分析
  if (msg.type === 'OPEN_AIAI') {
    chrome.storage.local.set({ aiai_pending: msg.data }, () => {
      chrome.tabs.query({ url: AIAI_URL + '/*' }, (tabs) => {
        if (tabs.length > 0) {
          const tab = tabs[0]
          chrome.tabs.update(tab.id, { active: true })
          chrome.windows.update(tab.windowId, { focused: true })
        } else {
          chrome.tabs.create({ url: AIAI_URL })
        }
      })
    })
  }

  // 複数動画分析（Businessプラン）
  if (msg.type === 'OPEN_AIAI_MULTI') {
    chrome.storage.local.set({ aiai_multi_pending: msg.data }, () => {
      chrome.tabs.query({ url: AIAI_URL + '/*' }, (tabs) => {
        if (tabs.length > 0) {
          const tab = tabs[0]
          chrome.tabs.update(tab.id, { active: true })
          chrome.windows.update(tab.windowId, { focused: true })
        } else {
          chrome.tabs.create({ url: AIAI_URL })
        }
      })
    })
  }
})
