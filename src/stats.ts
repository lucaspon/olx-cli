export function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

export function stdDev(values: number[]): number {
  if (values.length === 0) return 0
  const m = mean(values)
  const variance = values.reduce((sum, v) => sum + Math.pow(v - m, 2), 0) / values.length
  return Math.sqrt(variance)
}

export function min(values: number[]): number {
  return values.length === 0 ? 0 : Math.min(...values)
}

export function max(values: number[]): number {
  return values.length === 0 ? 0 : Math.max(...values)
}
