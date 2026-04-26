// Runs on https://yt-analysis-tool-mu.vercel.app/*
// 1. Receive auth token when user clicks "Chrome拡張と連携" on the web app
// 2. Forward pending analysis data to the page when AIAI-short loads

// --- 1. Receive token from web app ---
window.addEventListener('aiai-connect', (e) => {
  const token = e.detail?.token
  const refreshToken = e.detail?.refreshToken
  if (!token) return

  chrome.storage.local.set({
    aiai_token: token,
    aiai_session: { access_token: token, refresh_token: refreshToken ?? '' }
  }, () => {
    window.dispatchEvent(new CustomEvent('aiai-connect-reply', {
      detail: { success: true }
    }))
  })
})

// --- 2. Forward session + pending data to the page ---
const TARGET = 'https://yt-analysis-tool-mu.vercel.app'
let sent = false

function sendToPage() {
  if (sent) return
  chrome.storage.local.get(['aiai_session', 'aiai_pending'], (result) => {
    if (sent) return
    sent = true

    // Restore session first so the page is authenticated before analysis runs
    if (result.aiai_session?.access_token) {
      window.postMessage({ type: 'AIAI_RESTORE_SESSION', data: result.aiai_session }, TARGET)
    }

    if (result.aiai_pending) {
      window.postMessage({ type: 'AIAI_EXTENSION_PENDING', data: result.aiai_pending }, TARGET)
      chrome.storage.local.remove('aiai_pending')
    }
  })
}

// Initial load: try after delays
setTimeout(sendToPage, 800)
setTimeout(sendToPage, 2500)

// Page ready signal
window.addEventListener('message', (e) => {
  if (e.data?.type === 'AIAI_PAGE_READY') sendToPage()
})

// Background worker signals existing tab to check for pending data
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'AIAI_CHECK_PENDING') {
    sent = false // reset so sendToPage runs again
    sendToPage()
  }
})
