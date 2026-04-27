// Runs on https://yt-analysis-tool-mu.vercel.app/*
// 1. Auto-save session whenever user logs in (no need to click "連携" button)
// 2. Restore session + forward pending analysis data in new tabs

const TARGET = 'https://yt-analysis-tool-mu.vercel.app'

// --- 1. Auto-save session from page ---
window.addEventListener('aiai-session-update', (e) => {
  const { access_token, refresh_token } = e.detail ?? {}
  if (!access_token) return
  chrome.storage.local.set({
    aiai_token: access_token,
    aiai_session: { access_token, refresh_token: refresh_token ?? '' }
  })
})

// Legacy: manual connect button
window.addEventListener('aiai-connect', (e) => {
  const token = e.detail?.token
  const refreshToken = e.detail?.refreshToken
  if (!token) return
  chrome.storage.local.set({
    aiai_token: token,
    aiai_session: { access_token: token, refresh_token: refreshToken ?? '' }
  }, () => {
    window.dispatchEvent(new CustomEvent('aiai-connect-reply', { detail: { success: true } }))
  })
})

// --- 2. Restore session + forward pending data ---
let sent = false

function sendToPage() {
  if (sent) return
  chrome.storage.local.get(['aiai_session', 'aiai_pending'], (result) => {
    if (sent) return
    sent = true

    // Send RESTORE_SESSION first
    if (result.aiai_session?.access_token) {
      window.postMessage({ type: 'AIAI_RESTORE_SESSION', data: result.aiai_session }, TARGET)
    }

    // Send EXTENSION_PENDING after delay so setSession can complete
    if (result.aiai_pending) {
      const pending = result.aiai_pending
      chrome.storage.local.remove('aiai_pending')
      setTimeout(() => {
        window.postMessage({ type: 'AIAI_EXTENSION_PENDING', data: pending }, TARGET)
      }, 1500)
    }
  })
}

setTimeout(sendToPage, 600)
setTimeout(() => { sent = false; sendToPage() }, 2500)

window.addEventListener('message', (e) => {
  if (e.data?.type === 'AIAI_PAGE_READY') sendToPage()
})

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'AIAI_CHECK_PENDING') {
    sent = false
    window.postMessage({ type: 'AIAI_LOADING_START' }, TARGET)
    sendToPage()
  }
})
