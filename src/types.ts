export interface Ad {
  id: number
  title: string
  price: number
  url: string
  location?: string
  thumbnail?: string
  createdAt?: string
}

export interface SearchOptions {
  query?: string
  url?: string
  category?: string
  minPrice?: number
  maxPrice?: number
  condition?: 'new' | 'used'
  pages?: number
  limit?: number
  format: 'table' | 'json' | 'csv'
  sort?: 'price-asc' | 'price-desc' | 'date'
  filterSubstring?: string
}

export interface RawOlxAd {
  listId: number
  subject: string
  price?: string
  url?: string
  location?: string
  thumbnail?: string
  date?: number
}
