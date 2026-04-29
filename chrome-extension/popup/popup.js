const AIAI_URL = 'https://yt-analysis-tool-mu.vercel.app'

const statusEl = document.getElementById('status')
const dotEl = document.getElementById('dot')
const statusTextEl = document.getElementById('status-text')
const openBtn = document.getElementById('open-btn')
const disconnectBtn = document.getElementById('disconnect-btn')
const planBadge = document.getElementById('plan-badge')
const multiSection = document.getElementById('multi-section')
const videoListEl = document.getElementById('video-list')
const analyzeMultiBtn = document.getElementById('analyze-multi-btn')
const clearListBtn = document.getElementById('clear-list-btn')

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

function setPlan(plan) {
  planBadge.textContent = plan.toUpperCase()
  planBadge.className = `plan-badge ${plan}`
  if (plan === 'business') {
    multiSection.style.display = 'block'
  }
}

function renderVideoList(list) {
  if (!list || list.length === 0) {
    videoListEl.innerHTML = '<div class="empty-list">TikTok・Instagramで「＋ リストに追加」を押してください</div>'
    analyzeMultiBtn.disabled = true
    analyzeMultiBtn.textContent = 'まとめて分析する（0/5）'
    return
  }
  videoListEl.innerHTML = list.map((v, i) => {
    const label = v.title || v.url
    const short = label.length > 30 ? label.slice(0, 30) + '…' : label
    return `<div class="video-item">
      <div class="video-item-num">${i + 1}</div>
      <div class="video-item-url" title="${v.url}">${short}</div>
    </div>`
  }).join('')
  analyzeMultiBtn.disabled = list.length < 2
  analyzeMultiBtn.textContent = `まとめて分析する（${list.length}/5）`
}

// 初期化
chrome.storage.local.get(['aiai_token', 'aiai_plan', 'aiai_multi_list'], (result) => {
  const connected = Boolean(result.aiai_token)
  setConnected(connected)

  if (result.aiai_plan) {
    setPlan(result.aiai_plan)
  }

  if (result.aiai_plan === 'business') {
    renderVideoList(result.aiai_multi_list || [])
  }

  // プランをAPIから最新取得（接続済みの場合）
  if (connected && result.aiai_token) {
    fetch(`${AIAI_URL}/api/me`, {
      headers: { Authorization: `Bearer ${result.aiai_token}` }
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.plan) {
          chrome.storage.local.set({ aiai_plan: data.plan })
          setPlan(data.plan)
          if (data.plan === 'business') {
            chrome.storage.local.get(['aiai_multi_list'], (r2) => {
              renderVideoList(r2.aiai_multi_list || [])
            })
          }
        }
      })
      .catch(() => {})
  }
})

openBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: AIAI_URL })
})

disconnectBtn.addEventListener('click', () => {
  chrome.storage.local.remove(['aiai_token', 'aiai_plan', 'aiai_multi_list'], () => {
    setConnected(false)
    planBadge.textContent = 'FREE'
    planBadge.className = 'plan-badge free'
    multiSection.style.display = 'none'
  })
})

analyzeMultiBtn.addEventListener('click', () => {
  chrome.storage.local.get(['aiai_multi_list'], (result) => {
    const list = result.aiai_multi_list || []
    if (list.length < 2) return
    chrome.runtime.sendMessage({ type: 'OPEN_AIAI_MULTI', data: list })
    window.close()
  })
})

clearListBtn.addEventListener('click', () => {
  chrome.storage.local.remove('aiai_multi_list', () => {
    renderVideoList([])
  })
})
