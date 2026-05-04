// Instagram Reels content script
// Injects "分析する" button on Reels pages, scrapes DOM data, sends to AIAI-short

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

function getCurrentReelUrl() {
  // If already on a specific reel/post page (reel, reels, or p)
  if (/\/(reels?|p)\/[A-Za-z0-9_-]+/.test(location.pathname)) return window.location.href

  // Find the currently playing video first, then visible video
  const allVideos = Array.from(document.querySelectorAll('video'))
  const playingVideo = allVideos.find(v => !v.paused && v.readyState > 0)
  const visibleVideo = playingVideo || allVideos.find(v => {
    const r = v.getBoundingClientRect()
    const center = (r.top + r.bottom) / 2
    return center > window.innerHeight * 0.3 && center < window.innerHeight * 0.7
  }) || allVideos[0]

  if (visibleVideo) {
    const container = visibleVideo.closest('article, [role="presentation"], div[class*="reel"], section')
    const link = container?.querySelector('a[href*="/reels/"], a[href*="/reel/"], a[href*="/p/"]')
    if (link?.href) return link.href
  }

  // Fallback: first reel link on page
  const firstReelLink = document.querySelector('a[href*="/reels/"], a[href*="/reel/"], a[href*="/p/"]')
  return firstReelLink?.href || window.location.href
}

function scrapeData(overrideUrl) {
  const url = overrideUrl || getCurrentReelUrl()

  const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || ''
  const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || ''
  const descText = metaDesc || ogDesc

  // Format A: "username on Instagram: 'caption'"
  // Format B: "Jan 16, 2026, 32K likes, 375 comments - username: 'caption'"
  const fmtA = descText.match(/^(.+?)\s+on Instagram[:\s]+[\u201c\u2018'""]?([\s\S]+?)[\u201d\u2019'"""]?\s*$/i)
  const fmtB = descText.match(/[-\u2013]\s*([\w._]+):\s*[\u201c\u2018'""]?([\s\S]+?)[\u201d\u2019'"""]?\s*$/)

  const metaUsername = fmtA?.[1]?.trim() || fmtB?.[1]?.trim() || ''
  const metaCaption = (fmtA?.[2] || fmtB?.[2])?.trim() || ''

  const urlUserMatch = url.match(/instagram\.com\/(?!reels\/|p\/|stories\/)([^/?]+)\//)
  const channelName = metaUsername
    || getText(['header a[role="link"]'])
    || urlUserMatch?.[1] || ''

  const domCaption = getText(['h1._aacl', 'span._aacl._aaco._aacu._aacx._aad7._aade'])
  // Strip bio section after ___ separator (Instagram posts often append profile bio)
  const rawCaption = metaCaption || domCaption || ''
  const caption = rawCaption.split(/_{3,}|—{2,}/)[0].trim().slice(0, 200)

  const hashtagAnchors = Array.from(document.querySelectorAll('a[href*="/explore/tags/"]'))
    .map(el => el.textContent?.trim()).filter(Boolean)
  const hashtagsFromCaption = caption.match(/#[\w\u3000-\u9fff]+/g) || []
  const hashtags = [...new Set([...hashtagAnchors, ...hashtagsFromCaption])].join(' ')

  const bgm = getText(['a[href*="/reels/audio/"]', 'span[class*="audio-title"]']) || ''
  const thumbnailUrl = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || ''

  const likesText = getText(['section span[class*="html-span"]', 'a[href$="/liked_by/"] span'])
  const viewsText = getText(['span[class*="videoPlaybackPosition"]', 'span[class*="views"]'])

  const topComments = Array.from(document.querySelectorAll([
    'ul[class*="Mr508"] li span._aacl',
    'div[class*="comment"] span._aacl',
    'span[class*="html-span"][dir="auto"]',
  ].join(', ')))
    .map(el => el.textContent?.trim())
    .filter(t => t && t.length > 2 && !t.startsWith('#'))
    .slice(0, 10)

  return {
    url,
    title: caption,
    channelName,
    extensionData: {
      views: parseCount(viewsText),
      likes: parseCount(likesText),
      comments: null,
      captions: metaCaption || metaDesc,
      hashtags,
      bgm,
      thumbnailUrl,
      topComments,
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
    transition: opacity 0.2s;
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

  // Use URL stored at button injection time to avoid reel feed race conditions
  const storedUrl = btn.dataset.reelUrl || undefined

  try {
    const data = scrapeData(storedUrl)
    chrome.storage.local.get(['aiai_user_note'], (result) => {
      data.extensionData.userNote = result?.aiai_user_note || ''
      chrome.runtime.sendMessage({ type: 'OPEN_AIAI', data })
    })
  } catch (e) {
    console.error('[AIAI] scrapeData error', e)
    try { chrome.runtime.sendMessage({ type: 'OPEN_AIAI', data: scrapeData(storedUrl) }) } catch {}
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
  const btn = createButton()
  // Store the URL and scraped data at injection time to avoid race conditions on reel feed
  btn.dataset.reelUrl = getCurrentReelUrl()
  document.body.appendChild(btn)
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

// --- SPA navigation detection ---

function onNavigate() {
  removeButton()
  setTimeout(injectButton, 800)
}

// Intercept pushState/replaceState for reliable SPA detection
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

// Watch for plan changes (e.g., popup fetches /api/me and updates aiai_plan)
chrome.storage.onChanged.addListener((changes) => {
  if (changes.aiai_plan?.newValue === 'business' && !document.getElementById(ADD_BUTTON_ID)) {
    document.body?.appendChild(createAddButton())
  }
})
