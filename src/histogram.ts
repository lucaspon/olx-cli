import { formatCurrency } from './utils.js'

const BAR_CHAR = '█'
const EMPTY_CHAR = '░'
const MAX_WIDTH = 64
const LABEL_WIDTH = 20
const BAR_WIDTH = 18
const META_WIDTH = 8 // count + pct

export function formatHistogram(values: number[], bins = 10): string {
  if (values.length === 0) {
    return ''
  }

  const sorted = [...values].sort((a, b) => a - b)
  const min = sorted[0]
  const max = sorted[sorted.length - 1]

  if (min === max) {
    return `  All ${values.length} items at ${formatCurrency(min)}`
  }

  const binWidth = (max - min) / bins
  const counts = Array(bins).fill(0)

  for (const v of values) {
    const idx = Math.min(Math.floor((v - min) / binWidth), bins - 1)
    counts[idx]++
  }

  const maxCount = Math.max(...counts)

  const lines: string[] = []
  lines.push('')
  lines.push('  Price Histogram')
  lines.push('  ' + '─'.repeat(MAX_WIDTH - 4))

  for (let i = 0; i < bins; i++) {
    const binMin = min + i * binWidth
    const binMax = min + (i + 1) * binWidth
    const count = counts[i]
    const barLen = maxCount === 0 ? 0 : Math.round((count / maxCount) * BAR_WIDTH)
    const emptyLen = BAR_WIDTH - barLen

    const label = `${formatCurrency(Math.round(binMin))} – ${formatCurrency(Math.round(binMax))}`
    const bar = BAR_CHAR.repeat(barLen) + EMPTY_CHAR.repeat(emptyLen)
    const pct = `${((count / values.length) * 100).toFixed(0)}%`

    lines.push(
      `  ${label.padEnd(LABEL_WIDTH)} ${bar} ${count.toString().padStart(2)} ${pct.padStart(3)}`
    )
  }

  lines.push('  ' + '─'.repeat(MAX_WIDTH - 4))
  return lines.join('\n')
}
