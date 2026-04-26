import Table from 'cli-table3'
import stripAnsi from 'strip-ansi'
import type { Ad } from './types.js'
import { formatCurrency } from './utils.js'
import { mean, median, stdDev, min, max } from './stats.js'

export function formatOutput(ads: Ad[], format: 'table' | 'json' | 'csv'): string {
  switch (format) {
    case 'json':
      return formatJson(ads)
    case 'csv':
      return formatCsv(ads)
    case 'table':
    default:
      return formatTable(ads)
  }
}

function formatJson(ads: Ad[]): string {
  return JSON.stringify(ads, null, 2)
}

function formatCsv(ads: Ad[]): string {
  const headers = ['id', 'title', 'price', 'url', 'location']
  const rows = ads.map((ad) => [
    ad.id,
    escapeCsv(ad.title),
    ad.price,
    ad.url,
    escapeCsv(ad.location || ''),
  ])
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return str.slice(0, max - 3) + '...'
}

function hyperlink(url: string, text: string): string {
  // OSC 8 hyperlink escape sequence: clickable in most modern terminals
  const color = '\x1b[1;36m'
  const reset = '\x1b[0m'
  return `\x1b]8;;${url}\x1b\\${color}${text}${reset}\x1b]8;;\x1b\\`
}

function visWidth(str: string): number {
  return stripAnsi(str).length
}

function padVis(str: string, width: number): string {
  const w = visWidth(str)
  if (w >= width) return str
  return str + ' '.repeat(width - w)
}

function formatTable(ads: Ad[]): string {
  if (ads.length === 0) {
    return 'No ads found.'
  }

  const headers = ['ID', 'Price', 'Title', 'Link']
  const cols: string[][] = [headers]

  for (const ad of ads) {
    cols.push([
      String(ad.id),
      formatCurrency(ad.price),
      truncate(ad.title, 40),
      hyperlink(ad.url, '🔗 Open'),
    ])
  }

  const colWidths = headers.map((_, ci) => {
    let max = 0
    for (const row of cols) {
      max = Math.max(max, visWidth(row[ci]))
    }
    return max
  })

  const hLine = '┌' + colWidths.map((w) => '─'.repeat(w + 2)).join('┬') + '┐'
  const mLine = '├' + colWidths.map((w) => '─'.repeat(w + 2)).join('┼') + '┤'
  const bLine = '└' + colWidths.map((w) => '─'.repeat(w + 2)).join('┴') + '┘'

  const lines: string[] = []
  lines.push(hLine)

  for (let ri = 0; ri < cols.length; ri++) {
    const row = cols[ri]
    const padded = row.map((cell, ci) => ' ' + padVis(cell, colWidths[ci]) + ' ')
    lines.push('│' + padded.join('│') + '│')
    if (ri === 0) {
      lines.push(mLine)
    }
  }

  lines.push(bLine)
  lines.push('')
  lines.push(`Found ${ads.length} ad${ads.length === 1 ? '' : 's'}`)

  // Color the header row
  const headerIdx = 1
  const headerLine = lines[headerIdx]
  const coloredHeader = headerLine
    .split('│')
    .map((cell, i) => {
      if (i === 0 || i === headers.length + 1) return cell
      return '\x1b[1;36m' + cell + '\x1b[0m'
    })
    .join('│')
  lines[headerIdx] = coloredHeader

  return lines.join('\n')
}

// ─────────────────────────────────────────────────────────────
// Pivot table for multisearch
// ─────────────────────────────────────────────────────────────

export interface PivotRow {
  label: string
  values: (string | number)[]
}

export interface PivotData {
  queries: string[]
  rows: PivotRow[]
}

export function buildPivotData(adsByQuery: Map<string, Ad[]>): PivotData {
  const queries = Array.from(adsByQuery.keys())

  const rows: PivotRow[] = []

  rows.push({
    label: 'Count',
    values: queries.map((q) => adsByQuery.get(q)!.length),
  })

  rows.push({
    label: 'Min',
    values: queries.map((q) => {
      const prices = adsByQuery.get(q)!.map((a) => a.price).filter((p) => p > 0)
      return prices.length > 0 ? formatCurrency(min(prices)) : '—'
    }),
  })

  rows.push({
    label: 'Median',
    values: queries.map((q) => {
      const prices = adsByQuery.get(q)!.map((a) => a.price).filter((p) => p > 0)
      return prices.length > 0 ? formatCurrency(Math.round(median(prices))) : '—'
    }),
  })

  rows.push({
    label: 'Mean',
    values: queries.map((q) => {
      const prices = adsByQuery.get(q)!.map((a) => a.price).filter((p) => p > 0)
      return prices.length > 0 ? formatCurrency(Math.round(mean(prices))) : '—'
    }),
  })

  rows.push({
    label: 'Max',
    values: queries.map((q) => {
      const prices = adsByQuery.get(q)!.map((a) => a.price).filter((p) => p > 0)
      return prices.length > 0 ? formatCurrency(max(prices)) : '—'
    }),
  })

  rows.push({
    label: 'StdDev',
    values: queries.map((q) => {
      const prices = adsByQuery.get(q)!.map((a) => a.price).filter((p) => p > 0)
      return prices.length > 0 ? formatCurrency(Math.round(stdDev(prices))) : '—'
    }),
  })

  return { queries, rows }
}

export function formatPivotTable(data: PivotData): string {
  const { queries, rows } = data
  if (queries.length === 0) return 'No data.'

  const maxColWidth = 18
  const headers = queries.map((q) => truncate(q, maxColWidth))

  const table = new Table({
    head: ['', ...headers],
    style: { head: ['bold', 'cyan'] },
  })

  for (const row of rows) {
    table.push([row.label, ...row.values.map((v) => String(v))])
  }

  return '\n' + table.toString() + '\n'
}
