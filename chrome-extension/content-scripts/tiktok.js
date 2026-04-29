// TikTok content script
// Injects "分析する" button on video pages, scrapes DOM data, sends to AIAI-short

const AIAI_URL = 'https://yt-analysis-tool-mu.vercel.app'
const BUTTON_ID = 'aiai-analyze-btn'
const ADD_BUTTON_ID = 'aiai-add-btn'

// --- DOM scraping helpers ---

function getText(selectors) {
  for (const sel of selectors) {
    const el = document.querySelector(sel)
    if (el?.textContent?.trim()) return el.textContent.trim()
  }
  return null
}

function parseCount(text) {
  if (!text) return null
  const t = text.replace(/,/g, '').trim()
  if (t.endsWith('万')) return Math.round(parseFloat(t) * 10000)
  if (t.endsWith('M')) return Math.round(parseFloat(t) * 1000000)
  if (t.endsWith('K')) return Math.round(parseFloat(t) * 1000)
  const n = parseInt(t, 10)
  return isNaN(n) ? null : n
}

function getFrom(el, selectors) {
  for (const sel of selectors) {
    const found = el ? el.querySelector(sel) : document.querySelector(sel)
    if (found?.textContent?.trim()) return found.textContent.trim()
  }
  return null
}

function scrapeData() {
  // Find currently playing video and its container
  const videos = Array.from(document.querySelectorAll('video'))
  const playingVideo = videos.find(v => !v.paused && v.readyState > 0) || videos[0]
  const container = playingVideo?.closest('[data-e2e="recommend-list-item-container"], [class*="DivItemContainer"], article, section') || null

  // Get video URL from container link, fallback to window.location
  const videoLink = container?.querySelector('a[href*="/video/"]')
    || document.querySelector('a[href*="/video/"]')
  const url = videoLink
    ? new URL(videoLink.getAttribute('href'), location.origin).href
    : window.location.href

  // Scrape from container first, then page fallback
  const title = getFrom(container, [
    '[data-e2e="video-desc"]',
    '[data-e2e="browse-video-desc"]',
    'h1[data-e2e="video-title"]',
  ]) || getFrom(null, [
    '[data-e2e="video-desc"]',
    '[data-e2e="browse-video-desc"]',
  ]) || document.title

  const channelName = getFrom(container, [
    '[data-e2e="video-author-uniqueid"]',
    '[data-e2e="browse-video-author-uniqueid"]',
  ]) || getFrom(null, [
    '[data-e2e="video-author-uniqueid"]',
    '[data-e2e="browse-video-author-uniqueid"]',
  ]) || ''

  const likesText = getFrom(container, [
    'strong[data-e2e="like-count"]',
    '[data-e2e="like-count"]',
    'strong[data-e2e="browse-like-count"]',
  ])
  const commentsText = getFrom(container, [
    'strong[data-e2e="comment-count"]',
    '[data-e2e="comment-count"]',
    'strong[data-e2e="browse-comment-count"]',
  ])

  // Hashtags from container only (prevents bleeding from adjacent videos)
  const hashtagAnchors = Array.from((container || document).querySelectorAll('a[href*="/tag/"]'))
    .map(el => el.textContent?.trim()).filter(Boolean)
  const hashtagsFromTitle = (title.match(/#[\w\u3000-\u9fff]+/g) || [])
  const hashtags = [...new Set([...hashtagAnchors, ...hashtagsFromTitle])].join(' ')

  const bgm = getFrom(container, [
    '[data-e2e="browse-music"]',
    'a[href*="/music/"]',
    '[class*="MusicInfo"] span',
  ]) || getFrom(null, [
    '[data-e2e="browse-music"]',
    'a[href*="/music/"]',
  ]) || ''

  const captions = title

  return {
    url,
    title,
    channelName,
    extensionData: {
      views: null,
      likes: parseCount(likesText),
      comments: parseCount(commentsText),
      captions,
      hashtags,
      bgm,
      thumbnailUrl: '',
    },
  }
}

// --- Button injection ---

function createButton() {
  const btn = document.createElement('button')
  btn.id = BUTTON_ID
  btn.textContent = '分析する'
  btn.style.cssText = `
    position: fixed;
    bottom: 80px;
    right: 20px;
    z-index: 9999;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    border: none;
    border-radius: 24px;
    padding: 10px 20px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(99, 102, 241, 0.5);
    transition: opacity 0.2s, transform 0.1s;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  `
  btn.addEventListener('mouseenter', () => { btn.style.opacity = '0.9' })
  btn.addEventListener('mouseleave', () => { btn.style.opacity = '1' })
  btn.addEventListener('click', handleAnalyze)
  return btn
}

async function handleAnalyze() {
  const btn = document.getElementById(BUTTON_ID)
  if (!btn) return

  btn.textContent = '分析中...'
  btn.style.opacity = '0.7'
  btn.style.pointerEvents = 'none'

  try {
    const data = scrapeData()
    chrome.runtime.sendMessage({ type: 'OPEN_AIAI', data })
  } catch (e) {
    console.error('[AIAI] scrapeData error', e)
  }
  setTimeout(() => {
    btn.textContent = '分析する'
    btn.style.opacity = '1'
    btn.style.pointerEvents = 'auto'
  }, 2000)
}

function createAddButton() {
  const btn = document.createElement('button')
  btn.id = ADD_BUTTON_ID
  btn.textContent = '＋ リストに追加'
  btn.style.cssText = `
    position: fixed;
    bottom: 130px;
    right: 20px;
    z-index: 9999;
    background: rgba(16, 185, 129, 0.9);
    color: white;
    border: none;
    border-radius: 24px;
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(16, 185, 129, 0.4);
    transition: opacity 0.2s;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  `
  btn.addEventListener('mouseenter', () => { btn.style.opacity = '0.85' })
  btn.addEventListener('mouseleave', () => { btn.style.opacity = '1' })
  btn.addEventListener('click', handleAddToList)
  return btn
}

async function handleAddToList() {
  const btn = document.getElementById(ADD_BUTTON_ID)
  if (!btn) return
  const data = scrapeData()
  chrome.storage.local.get(['aiai_multi_list'], (result) => {
    const list = result.aiai_multi_list || []
    if (list.some((v) => v.url === data.url)) {
      btn.textContent = '✓ 追加済み'
      setTimeout(() => { btn.textContent = '＋ リストに追加' }, 2000)
      return
    }
    if (list.length >= 5) {
      btn.textContent = '上限5本です'
      setTimeout(() => { btn.textContent = '＋ リストに追加' }, 2000)
      return
    }
    list.push(data)
    chrome.storage.local.set({ aiai_multi_list: list }, () => {
      btn.textContent = `✓ 追加（${list.length}/5）`
      setTimeout(() => { btn.textContent = '＋ リストに追加' }, 2000)
    })
  })
}

function injectButton() {
  if (document.getElementById(BUTTON_ID)) return
  if (!document.body) return
  document.body.appendChild(createButton())
  // Businessプランなら追加ボタンも表示
  chrome.storage.local.get(['aiai_plan'], (result) => {
    if (result.aiai_plan === 'business' && !document.getElementById(ADD_BUTTON_ID)) {
      document.body.appendChild(createAddButton())
    }
  })
}

function removeButton() {
  document.getElementById(BUTTON_ID)?.remove()
  document.getElementById(ADD_BUTTON_ID)?.remove()
}

// --- SPA navigation detection (same as instagram.js) ---

function onNavigate() {
  removeButton()
  setTimeout(injectButton, 1000)
}

const _push = history.pushState.bind(history)
history.pushState = function (...args) {
  _push(...args)
  onNavigate()
}
const _replace = history.replaceState.bind(history)
history.replaceState = function (...args) {
  _replace(...args)
  onNavigate()
}
window.addEventListener('popstate', onNavigate)

setTimeout(injectButton, 1500)
