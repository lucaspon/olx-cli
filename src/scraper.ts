import type { Ad, RawOlxAd, SearchOptions } from './types.js'
import { buildSearchUrl, parsePrice } from './utils.js'

const JA3_FINGERPRINTS = [
  [
    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:87.0) Gecko/20100101 Firefox/87.0',
    '771,4865-4867-4866-49195-49199-52393-52392-49196-49200-49162-49161-49171-49172-51-57-47-53-10,0-23-65281-10-11-35-16-5-51-43-13-45-28-21,29-23-24-25-256-257,0',
  ],
  [
    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:87.0) Gecko/20100101 Firefox/87.0',
    '771,4865-4866-4867-49195-49199-49196-49200-52393-52392-49171-49172-156-157-47-53,27-51-35-13-18-23-16-0-5-65281-11-43-10-45-17513-21,29-23-24,0',
  ],
]

const HEADERS = {
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
  'Accept-Language': 'en-US,en;q=0.5',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  Pragma: 'no-cache',
  'Cache-Control': 'no-cache',
}

function setPageParam(url: string, page: number): string {
  const u = new URL(url)
  u.searchParams.set('o', String(page))
  return u.toString()
}

function getRandomFingerprint(): [string, string] {
  return JA3_FINGERPRINTS[Math.floor(Math.random() * JA3_FINGERPRINTS.length)] as [string, string]
}

const RSC_CHUNK_RE = /self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g

function extractBalancedArray(str: string, start: number): string | null {
  let depth = 0
  for (let i = start; i < str.length; i++) {
    if (str[i] === '[') depth++
    else if (str[i] === ']') {
      depth--
      if (depth === 0) return str.slice(start, i + 1)
    }
  }
  return null
}

// OLX's search page is a Next.js App Router page that streams its props as
// React Server Component chunks (`self.__next_f.push([1, "..."])`) instead of
// the single `__NEXT_DATA__` script tag used by the old Pages Router. The ad
// list shows up as a plain `"ads":[...]` JSON array inside one of those chunks.
function extractRawAds(html: string): RawOlxAd[] | null {
  for (const match of html.matchAll(RSC_CHUNK_RE)) {
    let decoded: string
    try {
      decoded = JSON.parse(match[1])
    } catch {
      continue
    }

    const key = '"ads":'
    const keyIdx = decoded.indexOf(key)
    if (keyIdx === -1) continue

    const arrStart = decoded.indexOf('[', keyIdx + key.length)
    if (arrStart === -1) continue

    const arrStr = extractBalancedArray(decoded, arrStart)
    if (!arrStr) continue

    try {
      const ads = JSON.parse(arrStr)
      if (Array.isArray(ads)) return ads
    } catch {
      continue
    }
  }

  return null
}

interface CycleTLSResponse {
  status: number
  text(): Promise<string>
}

interface CycleTLSInstance {
  (url: string, options: Record<string, unknown>, method: string): Promise<CycleTLSResponse>
  exit(): void
}

async function fetchPage(url: string): Promise<string> {
  // @ts-expect-error cycletls has no typings
  const initCycleTLS = (await import('cycletls')).default as () => Promise<CycleTLSInstance>
  const cycleTLS = await initCycleTLS()

  try {
    const [userAgent, ja3] = getRandomFingerprint()

    const response = await cycleTLS(url, {
      userAgent,
      ja3,
      headers: HEADERS,
    }, 'get')

    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status} for ${url}`)
    }

    return await response.text()
  } finally {
    cycleTLS.exit()
  }
}

export async function fetchAds(options: SearchOptions): Promise<Ad[]> {
  const baseUrl = buildSearchUrl(options)
  const maxPages = options.pages || 1
  const limit = options.limit

  const ads: Ad[] = []

  for (let page = 1; page <= maxPages; page++) {
    const pageUrl = page === 1 ? baseUrl : setPageParam(baseUrl, page)

    const html = await fetchPage(pageUrl)

    const rawAds = extractRawAds(html)
    if (rawAds === null) {
      throw new Error('Could not find ad data on the page. OLX may have changed their layout.')
    }

    if (rawAds.length === 0) {
      break
    }

    for (const raw of rawAds) {
      if (!raw.listId) continue

      const title = raw.subject || 'No title'

      // Exclude ads whose titles contain any filter substring (case-insensitive)
      if (options.filterSubstrings && options.filterSubstrings.length > 0) {
        const lowerTitle = title.toLowerCase()
        const shouldExclude = options.filterSubstrings.some((needle) =>
          lowerTitle.includes(needle.toLowerCase())
        )
        if (shouldExclude) {
          continue
        }
      }

      const ad: Ad = {
        id: raw.listId,
        title,
        price: parsePrice(raw.price),
        url: raw.url || '',
        location: raw.location,
        thumbnail: raw.thumbnail || raw.images?.[0]?.original,
        createdAt: raw.date ? new Date(raw.date * 1000).toISOString() : undefined,
      }

      ads.push(ad)

      if (limit && ads.length >= limit) {
        return sortAds(ads, options.sort)
      }
    }
  }

  return sortAds(ads, options.sort)
}

function sortAds(ads: Ad[], sort?: SearchOptions['sort']): Ad[] {
  if (!sort) return ads

  const sorted = [...ads]

  switch (sort) {
    case 'price-asc':
      sorted.sort((a, b) => a.price - b.price)
      break
    case 'price-desc':
      sorted.sort((a, b) => b.price - a.price)
      break
    case 'date':
      sorted.sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return db - da
      })
      break
  }

  return sorted
}
