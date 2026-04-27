// Instagram Reels content script
// Injects "分析する" button on Reels pages, scrapes DOM data, sends to AIAI-short

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

  // meta description format: "username on Instagram: 'caption'" or "X views - username on Instagram"
  const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || ''
  const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || ''
  const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || ''

  // Extract username from meta description "username on Instagram" pattern
  const metaUserMatch = (metaDesc || ogDesc).match(/^(.+?)\s+on Instagram/i)
  const metaUsername = metaUserMatch?.[1]?.trim() || ''

  // Author username: prefer meta-extracted, fall back to DOM, then URL (skip "reels"/"p" path segments)
  const urlUserMatch = url.match(/instagram\.com\/(?!reels\/|p\/|stories\/)([^/?]+)\//)
  const channelName = metaUsername ||
    getText([
      'header a[role="link"]',
      'a[href*="/"] span.notranslate',
      'span._aacl._aaco._aacw._aacx._aad7._aade',
    ]) || urlUserMatch?.[1] || ''

  // Extract caption from meta description (after "username on Instagram: 'caption'")
  const metaCaptionMatch = (metaDesc || ogDesc).match(/on Instagram[:\s]+['"]([\s\S]*?)['"]\s*$/i)
  const metaCaption = metaCaptionMatch?.[1]?.trim() || ''

  // Caption / title from DOM or meta
  const domCaption = getText([
    'h1._aacl',
    'span._aacl._aaco._aacu._aacx._aad7._aade',
    'div._a9zs span',
    'li[role="menuitem"] span',
  ])
  const caption = domCaption || metaCaption || ogTitle || metaDesc || document.title

  // Likes
  const likesText = getText([
    'section span[class*="html-span"]',
    'button[type="button"] span span',
    'a[href$="/liked_by/"] span',
  ])

  // Views (Reels sometimes show view count)
  const viewsText = getText([
    'span[class*="videoPlaybackPosition"]',
    'span[class*="views"]',
  ])

  // Hashtags from caption text and anchor tags
  const hashtagAnchors = Array.from(document.querySelectorAll('a[href*="/explore/tags/"]'))
    .map(el => el.textContent?.trim())
    .filter(Boolean)
  const hashtagsFromCaption = (caption.match(/#[\w\u3000-\u9fff]+/g) || [])
  const hashtags = [...new Set([...hashtagAnchors, ...hashtagsFromCaption])].join(' ')

  // BGM / audio name
  const bgm = getText([
    'span[class*="audio-title"]',
    'div[class*="audio"] a',
    'a[href*="/reels/audio/"]',
    'span._aacl._aaco._aacu',
  ]) || ''

  // Thumbnail from og:image
  const thumbnailUrl = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || ''

  return {
    url,
    title: caption,
    channelName,
    extensionData: {
      views: parseCount(viewsText),
      likes: parseCount(likesText),
      comments: null,
      captions: metaCaption || domCaption || metaDesc,
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

  const data = scrapeData()

  chrome.runtime.sendMessage({ type: 'OPEN_AIAI', data })
  setTimeout(() => {
    btn.textContent = '分析する'
    btn.style.opacity = '1'
    btn.style.pointerEvents = 'auto'
  }, 2000)
}

function injectButton() {
  if (document.getElementById(BUTTON_ID)) return
  if (!document.body) return
  document.body.appendChild(createButton())
}

function removeButton() {
  document.getElementById(BUTTON_ID)?.remove()
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
