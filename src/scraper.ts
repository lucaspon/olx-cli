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

    // Extract __NEXT_DATA__ script
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (!match) {
      throw new Error('Could not find ad data on the page. OLX may have changed their layout.')
    }

    const data = JSON.parse(match[1])
    const rawAds: RawOlxAd[] = data?.props?.pageProps?.ads || []

    if (!Array.isArray(rawAds) || rawAds.length === 0) {
      break
    }

    for (const raw of rawAds) {
      if (!raw.listId) continue

      const title = raw.subject || 'No title'

      // Exclude ads whose titles contain the filter substring (case-insensitive)
      if (options.filterSubstring) {
        const needle = options.filterSubstring.toLowerCase()
        if (title.toLowerCase().includes(needle)) {
          continue
        }
      }

      const ad: Ad = {
        id: raw.listId,
        title,
        price: parsePrice(raw.price),
        url: raw.url || '',
        location: raw.location,
        thumbnail: raw.thumbnail,
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
