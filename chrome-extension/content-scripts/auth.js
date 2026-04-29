// Runs on https://yt-analysis-tool-mu.vercel.app/*
// Restores session and forwards pending extension data to the page

const TARGET = 'https://yt-analysis-tool-mu.vercel.app'

// Auto-save session when user logs in
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

// Check storage and forward to page
let processing = false
function checkAndForward() {
  if (processing) return
  processing = true

  chrome.storage.local.get(['aiai_session', 'aiai_pending', 'aiai_multi_pending'], (result) => {
    processing = false

    if (result.aiai_session?.access_token) {
      window.postMessage({ type: 'AIAI_RESTORE_SESSION', data: result.aiai_session }, TARGET)
    }

    if (result.aiai_pending) {
      const pending = result.aiai_pending
      chrome.storage.local.remove('aiai_pending')
      window.postMessage({ type: 'AIAI_LOADING_START' }, TARGET)
      setTimeout(() => {
        window.postMessage({ type: 'AIAI_EXTENSION_PENDING', data: pending }, TARGET)
      }, 800)
    }

    if (result.aiai_multi_pending) {
      const multiPending = result.aiai_multi_pending
      chrome.storage.local.remove('aiai_multi_pending')
      window.postMessage({ type: 'AIAI_LOADING_START' }, TARGET)
      setTimeout(() => {
        window.postMessage({ type: 'AIAI_MULTI_PENDING', data: multiPending }, TARGET)
      }, 800)
    }
  })
}

// On page load
setTimeout(checkAndForward, 600)

// When tab is focused (background.js focuses existing tab)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    setTimeout(checkAndForward, 300)
  }
})

// Page signals it's ready
window.addEventListener('message', (e) => {
  if (e.data?.type === 'AIAI_PAGE_READY') checkAndForward()
})
