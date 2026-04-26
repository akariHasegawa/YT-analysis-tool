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

  // Author username from URL or DOM
  const urlMatch = url.match(/instagram\.com\/([^/?]+)\//)
  const channelName = getText([
    'header a[role="link"]',
    'a[href*="/"] span.notranslate',
    'span._aacl._aaco._aacw._aacx._aad7._aade',
  ]) || urlMatch?.[1] || ''

  // Caption / title
  const caption = getText([
    'h1._aacl',
    'span._aacl._aaco._aacu._aacx._aad7._aade',
    'div._a9zs span',
    'li[role="menuitem"] span',
    'meta[property="og:description"]',
  ]) || document.title

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

  // Captions from accessible description
  const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || ''

  return {
    url,
    title: caption,
    channelName,
    extensionData: {
      views: parseCount(viewsText),
      likes: parseCount(likesText),
      comments: null,
      captions: metaDesc || caption,
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

  chrome.storage.local.set({ aiai_pending: data }, () => {
    window.open(AIAI_URL, '_blank')
    setTimeout(() => {
      btn.textContent = '分析する'
      btn.style.opacity = '1'
      btn.style.pointerEvents = 'auto'
    }, 2000)
  })
}

function isReelsPage() {
  return /instagram\.com\/(reels?|p)\//.test(location.href)
}

function injectButton() {
  if (document.getElementById(BUTTON_ID)) return
  if (!isReelsPage()) return
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
  setTimeout(injectButton, 1500)
}

const observer = new MutationObserver(onUrlChange)
observer.observe(document.body, { childList: true, subtree: true })

setTimeout(injectButton, 1500)
