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

function getTextFromEl(el, selectors) {
  for (const sel of selectors) {
    const found = el?.querySelector(sel)
    if (found?.textContent?.trim()) return found.textContent.trim()
  }
  return null
}

function scrapeData() {
  // URL is always window.location.href (Instagram SPA updates this correctly)
  const url = window.location.href

  // Extract Reel ID from current URL to find the matching article
  const reelIdMatch = url.match(/\/(reel|reels|p)\/([A-Za-z0-9_-]+)/)
  const currentReelId = reelIdMatch?.[2] || ''

  // Find article matching this specific Reel ID via its link
  let currentArticle = null
  if (currentReelId) {
    const matchingLink = document.querySelector(`a[href*="${currentReelId}"]`)
    currentArticle = matchingLink?.closest('article, section, [role="presentation"]') || null
  }
  // Fallback: currently playing video's parent
  if (!currentArticle) {
    const videos = Array.from(document.querySelectorAll('video'))
    const playingVideo = videos.find(v => !v.paused && v.readyState > 0) || videos[0]
    currentArticle = playingVideo?.closest('article, section, [role="presentation"]') || null
  }

  // --- Article-based scraping (reliable in feed) ---
  const articleCaption = getTextFromEl(currentArticle, [
    'h1', 'span[class*="x193iq5w"]', 'div[class*="caption"] span',
    'span._aacl._aaco._aacu._aacx._aad7._aade',
  ])

  const articleUsername = (() => {
    if (!currentArticle) return ''
    // Username links inside the article
    const links = Array.from(currentArticle.querySelectorAll('a[href^="/"][role="link"], a[href^="/"][tabindex="0"]'))
    for (const a of links) {
      const txt = a.textContent?.trim()
      if (txt && !txt.startsWith('#') && txt.length > 0 && txt.length < 50) return txt
    }
    return ''
  })()

  const articleHashtags = currentArticle
    ? Array.from(currentArticle.querySelectorAll('a[href*="/explore/tags/"]'))
        .map(el => el.textContent?.trim()).filter(Boolean)
    : []

  const articleBgm = getTextFromEl(currentArticle, [
    'a[href*="/reels/audio/"]',
    'span[class*="audio"]',
    'div[class*="music"] a',
  ]) || ''

  // Thumbnail: prefer video poster, then og:image
  const thumbnailUrl = playingVideo?.poster
    || document.querySelector('meta[property="og:image"]')?.getAttribute('content')
    || ''

  // --- Meta tag fallback ---
  const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || ''
  const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || ''
  const descText = metaDesc || ogDesc

  const metaUserMatch = descText.match(/^(.+?)\s+on Instagram/i)
  const metaUsername = metaUserMatch?.[1]?.trim() || ''

  const metaCaptionMatch = descText.match(/on Instagram[:\s]+[\u201c\u2018'""]?([\s\S]+?)[\u201d\u2019'"""]?\s*$/i)
  const metaCaption = metaCaptionMatch?.[1]?.trim() || ''

  const urlUserMatch = url.match(/instagram\.com\/(?!reels\/|p\/|stories\/)([^/?]+)\//)

  // --- Merge: article > meta > url ---
  const channelName = articleUsername || metaUsername || urlUserMatch?.[1] || ''
  const caption = articleCaption || metaCaption || descText || document.title

  const hashtagsFromCaption = (caption.match(/#[\w\u3000-\u9fff]+/g) || [])
  const hashtags = [...new Set([...articleHashtags, ...hashtagsFromCaption])].join(' ')
  const bgm = articleBgm || getText([
    'a[href*="/reels/audio/"]',
    'span[class*="audio-title"]',
  ]) || ''

  // Likes / Views
  const likesText = getTextFromEl(currentArticle, [
    'section span[class*="html-span"]',
    'button[type="button"] span span',
    'a[href$="/liked_by/"] span',
  ]) || getText(['section span[class*="html-span"]', 'a[href$="/liked_by/"] span'])

  const viewsText = getTextFromEl(currentArticle, [
    'span[class*="videoPlaybackPosition"]',
    'span[class*="views"]',
  ]) || null

  return {
    url,
    title: caption,
    channelName,
    extensionData: {
      views: parseCount(viewsText),
      likes: parseCount(likesText),
      comments: null,
      captions: articleCaption || metaCaption || metaDesc,
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
