const AIAI_URL = 'https://yt-analysis-tool-mu.vercel.app'

const statusEl = document.getElementById('status')
const dotEl = document.getElementById('dot')
const statusTextEl = document.getElementById('status-text')
const openBtn = document.getElementById('open-btn')
const disconnectBtn = document.getElementById('disconnect-btn')

function setConnected(connected) {
  if (connected) {
    statusEl.className = 'status connected'
    dotEl.className = 'dot green'
    statusTextEl.textContent = '接続済み'
    openBtn.textContent = 'AIAI-shortを開く'
    disconnectBtn.style.display = 'block'
  } else {
    statusEl.className = 'status disconnected'
    dotEl.className = 'dot red'
    statusTextEl.textContent = '未接続'
    openBtn.textContent = 'AIAI-shortで連携する'
    disconnectBtn.style.display = 'none'
  }
}

// Check connection status on popup open
chrome.storage.local.get(['aiai_token'], (result) => {
  setConnected(Boolean(result.aiai_token))
})

openBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: AIAI_URL })
})

disconnectBtn.addEventListener('click', () => {
  chrome.storage.local.remove('aiai_token', () => {
    setConnected(false)
  })
})
