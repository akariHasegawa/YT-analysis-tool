// Runs on https://yt-analysis-tool-mu.vercel.app/*
// 1. Receive auth token when user clicks "Chrome拡張と連携" on the web app
// 2. Forward pending analysis data to the page when AIAI-short loads

// --- 1. Receive token from web app ---
window.addEventListener('aiai-connect', (e) => {
  const token = e.detail?.token
  if (!token) return

  chrome.storage.local.set({ aiai_token: token }, () => {
    // Notify the page that connection succeeded
    window.dispatchEvent(new CustomEvent('aiai-connect-reply', {
      detail: { success: true }
    }))
  })
})

// --- 2. Forward pending extension data to the page ---
chrome.storage.local.get(['aiai_pending'], (result) => {
  if (!result.aiai_pending) return

  // Use postMessage so the page's JS can receive it
  window.postMessage({
    type: 'AIAI_EXTENSION_PENDING',
    data: result.aiai_pending
  }, 'https://yt-analysis-tool-mu.vercel.app')

  chrome.storage.local.remove('aiai_pending')
})
