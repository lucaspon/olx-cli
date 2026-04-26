import type { SearchOptions } from './types.js'

export function buildSearchUrl(options: SearchOptions): string {
  if (options.url) {
    return options.url
  }

  const query = options.query || ''
  const category = options.category || ''

  let url = 'https://www.olx.com.br'

  if (category) {
    url += `/${category}`
  } else {
    url += '/brasil'
  }

  url += '?'

  const params = new URLSearchParams()

  if (query) {
    params.set('q', query)
  }

  if (options.minPrice !== undefined) {
    params.set('ps', String(options.minPrice))
  }

  if (options.maxPrice !== undefined) {
    params.set('pe', String(options.maxPrice))
  }

  if (options.condition === 'new') {
    params.append('cond', '1')
  } else if (options.condition === 'used') {
    params.append('cond', '2')
  }

  return url + params.toString()
}

export function parsePrice(priceStr?: string): number {
  if (!priceStr) return 0
  const cleaned = priceStr
    .replace('R$', '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim()
  const value = parseFloat(cleaned)
  return isNaN(value) ? 0 : Math.round(value)
}

export function formatCurrency(value: number): string {
  if (value === 0) return 'R$ 0'
  return `R$ ${value.toLocaleString('pt-BR')}`
}
