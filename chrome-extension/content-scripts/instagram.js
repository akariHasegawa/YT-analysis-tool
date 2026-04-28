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
  const caption = (metaCaption || domCaption || '').slice(0, 500)

  const hashtagAnchors = Array.from(document.querySelectorAll('a[href*="/explore/tags/"]'))
    .map(el => el.textContent?.trim()).filter(Boolean)
  const hashtagsFromCaption = caption.match(/#[\w\u3000-\u9fff]+/g) || []
  const hashtags = [...new Set([...hashtagAnchors, ...hashtagsFromCaption])].join(' ')

  const bgm = getText(['a[href*="/reels/audio/"]', 'span[class*="audio-title"]']) || ''
  const thumbnailUrl = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || ''

  const likesText = getText(['section span[class*="html-span"]', 'a[href$="/liked_by/"] span'])
  const viewsText = getText(['span[class*="videoPlaybackPosition"]', 'span[class*="views"]'])

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
