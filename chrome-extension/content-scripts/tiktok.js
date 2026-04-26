// TikTok content script
// Injects "分析する" button on video pages, scrapes DOM data, sends to AIAI-short

const AIAI_URL = 'https://yt-analysis-tool-mu.vercel.app'
const BUTTON_ID = 'aiai-analyze-btn'

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

function scrapeData() {
  const url = window.location.href

  const title = getText([
    '[data-e2e="video-desc"]',
    '[data-e2e="browse-video-desc"]',
    'h1[data-e2e="video-title"]',
    '.video-meta-title',
  ]) || document.title

  const channelName = getText([
    '[data-e2e="video-author-uniqueid"]',
    '[data-e2e="browse-video-author-uniqueid"]',
    'a[data-e2e="video-author-avatar"] + div span',
    'h3[data-e2e="user-title"]',
  ]) || ''

  const viewsText = getText([
    'strong[data-e2e="video-views"]',
    '[data-e2e="video-views"]',
    '[data-e2e="browse-video-views"]',
  ])
  const likesText = getText([
    'strong[data-e2e="like-count"]',
    '[data-e2e="like-count"]',
    'strong[data-e2e="browse-like-count"]',
    '[data-e2e="browse-like-count"]',
  ])
  const commentsText = getText([
    'strong[data-e2e="comment-count"]',
    '[data-e2e="comment-count"]',
    'strong[data-e2e="browse-comment-count"]',
    '[data-e2e="browse-comment-count"]',
  ])

  // Captions from subtitle elements
  const captionEls = document.querySelectorAll(
    '[class*="DivCaptionContainer"] span, [class*="caption"] span, [data-e2e="video-caption"] span'
  )
  const captions = Array.from(captionEls)
    .map(el => el.textContent?.trim())
    .filter(Boolean)
    .join(' ')

  // Hashtags from title text and anchor tags
  const hashtagAnchors = Array.from(document.querySelectorAll('a[href*="/tag/"]'))
    .map(el => el.textContent?.trim())
    .filter(Boolean)
  const hashtagsFromTitle = (title.match(/#[\w\u3000-\u9fff]+/g) || [])
  const hashtags = [...new Set([...hashtagAnchors, ...hashtagsFromTitle])].join(' ')

  // BGM / music name
  const bgm = getText([
    '[data-e2e="browse-music"]',
    'div[class*="music-info"] a',
    'a[href*="/music/"]',
    '[class*="MusicInfo"] span',
  ]) || ''

  // Thumbnail from og:image
  const thumbnailUrl = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || ''

  return {
    url,
    title,
    channelName,
    extensionData: {
      views: parseCount(viewsText),
      likes: parseCount(likesText),
      comments: parseCount(commentsText),
      captions,
      hashtags,
      bgm,
      thumbnailUrl,
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

  const data = scrapeData()

  chrome.storage.local.set({ aiai_pending: data }, () => {
    window.open(AIAI_URL, '_blank')
    setTimeout(() => {
      btn.textContent = '分析する'
      btn.style.opacity = '1'
      btn.style.pointerEvents = 'auto'
    }, 2000)
  })
}

function isVideoPage() {
  return /tiktok\.com\/@[^/]+\/video\/\d+/.test(location.href)
    || /tiktok\.com\/t\//.test(location.href)
}

function injectButton() {
  if (document.getElementById(BUTTON_ID)) return
  if (!isVideoPage()) return
  document.body.appendChild(createButton())
}

function removeButton() {
  document.getElementById(BUTTON_ID)?.remove()
}

// --- SPA navigation detection ---

let lastUrl = location.href

function onUrlChange() {
  if (location.href === lastUrl) return
  lastUrl = location.href
  removeButton()
  setTimeout(injectButton, 1500) // wait for DOM to settle
}

// MutationObserver for SPA navigation
const observer = new MutationObserver(onUrlChange)
observer.observe(document.body, { childList: true, subtree: true })

// Initial injection
setTimeout(injectButton, 1500)
