#!/usr/bin/env node

import { Command } from 'commander'
import { fetchAds } from './scraper.js'
import { formatOutput, buildPivotData, formatPivotTable } from './formatter.js'
import { formatHistogram } from './histogram.js'
import { mean, median, stdDev, min, max } from './stats.js'
import { formatCurrency } from './utils.js'
import type { SearchOptions, Ad } from './types.js'

const program = new Command()

program
  .name('olx-cli')
  .description('Search OLX Brazil ads from the command line')
  .version('1.0.0')

program
  .command('search [query]')
  .description('Search for ads on OLX Brazil')
  .option('-u, --url <url>', 'Use a raw OLX search URL instead of building one')
  .option('-c, --category <category>', 'Category slug (e.g. informatica, imoveis)')
  .option('--min-price <price>', 'Minimum price filter (R$)', parseFloat)
  .option('--max-price <price>', 'Maximum price filter (R$)', parseFloat)
  .option('--condition <condition>', 'Condition filter: new or used')
  .option('--filter-substring <text>', 'Exclude ads whose title contains this text')
  .option('-p, --pages <n>', 'Number of pages to fetch', parseInt, 1)
  .option('-l, --limit <n>', 'Maximum number of ads to return', parseInt)
  .option('-f, --format <format>', 'Output format: table, json, or csv', 'table')
  .option('-s, --sort <sort>', 'Sort results: price-asc, price-desc, or date')
  .action(async (query: string | undefined, options: Record<string, unknown>) => {
    try {
      if (!query && !options.url) {
        console.error('Error: Provide a search query or use --url')
        process.exit(1)
      }

      const condition = options.condition as string | undefined
      if (condition && condition !== 'new' && condition !== 'used') {
        console.error('Error: --condition must be "new" or "used"')
        process.exit(1)
      }

      const format = options.format as string
      if (!['table', 'json', 'csv'].includes(format)) {
        console.error('Error: --format must be "table", "json", or "csv"')
        process.exit(1)
      }

      const searchOpts: SearchOptions = {
        query,
        url: options.url as string | undefined,
        category: options.category as string | undefined,
        minPrice: options.minPrice as number | undefined,
        maxPrice: options.maxPrice as number | undefined,
        condition: condition as 'new' | 'used' | undefined,
        filterSubstring: options.filterSubstring as string | undefined,
        pages: options.pages as number,
        limit: options.limit as number | undefined,
        format: format as 'table' | 'json' | 'csv',
        sort: options.sort as 'price-asc' | 'price-desc' | 'date' | undefined,
      }

      console.error('Searching OLX...')
      const ads = await fetchAds(searchOpts)

      if (ads.length === 0) {
        console.error('No ads found.')
        process.exit(0)
      }

      console.log(formatOutput(ads, searchOpts.format))

      // Stats & histogram on stderr so they don't corrupt json/csv stdout
      const prices = ads.map(a => a.price).filter(p => p > 0)
      if (prices.length > 0) {
        const statsLines = [
          '',
          '  Stats',
          '  ──────────────────────────────────────────',
          `  Count    ${String(prices.length).padStart(12)}`,
          `  Min      ${formatCurrency(min(prices)).padStart(12)}`,
          `  Median   ${formatCurrency(Math.round(median(prices))).padStart(12)}`,
          `  Mean     ${formatCurrency(Math.round(mean(prices))).padStart(12)}`,
          `  Max      ${formatCurrency(max(prices)).padStart(12)}`,
          `  StdDev   ${formatCurrency(Math.round(stdDev(prices))).padStart(12)}`,
          '  ──────────────────────────────────────────',
        ]
        console.error(statsLines.join('\n'))
        console.error(formatHistogram(prices, Math.min(10, prices.length)))
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`Error: ${message}`)
      process.exit(1)
    }
  })

program
  .command('multisearch <queries...>')
  .description('Run multiple searches sequentially and compare their stats')
  .option('-c, --category <category>', 'Category slug (e.g. informatica, imoveis)')
  .option('--min-price <price>', 'Minimum price filter (R$)', parseFloat)
  .option('--max-price <price>', 'Maximum price filter (R$)', parseFloat)
  .option('--condition <condition>', 'Condition filter: new or used')
  .option('--filter-substring <text>', 'Exclude ads whose title contains this text')
  .option('-p, --pages <n>', 'Number of pages to fetch per search', parseInt, 1)
  .option('-l, --limit <n>', 'Maximum number of ads per search', parseInt)
  .option('-s, --sort <sort>', 'Sort results: price-asc, price-desc, or date')
  .action(async (queries: string[], options: Record<string, unknown>) => {
    try {
      if (queries.length > 5) {
        console.error('Error: Maximum 5 queries allowed')
        process.exit(1)
      }

      const condition = options.condition as string | undefined
      if (condition && condition !== 'new' && condition !== 'used') {
        console.error('Error: --condition must be "new" or "used"')
        process.exit(1)
      }

      const baseOpts: SearchOptions = {
        category: options.category as string | undefined,
        minPrice: options.minPrice as number | undefined,
        maxPrice: options.maxPrice as number | undefined,
        condition: condition as 'new' | 'used' | undefined,
        filterSubstring: options.filterSubstring as string | undefined,
        pages: options.pages as number,
        limit: options.limit as number | undefined,
        format: 'table',
        sort: options.sort as 'price-asc' | 'price-desc' | 'date' | undefined,
      }

      console.error(`Running ${queries.length} searches...`)

      const adsByQuery = new Map<string, Ad[]>()
      let totalAds = 0

      for (const query of queries) {
        console.error(`  → "${query}"`)
        try {
          const searchOpts: SearchOptions = { ...baseOpts, query }
          const ads = await fetchAds(searchOpts)
          adsByQuery.set(query, ads)
          totalAds += ads.length
          console.error(`    ✓ ${ads.length} ads`)
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          console.error(`    ✗ failed: ${message}`)
          adsByQuery.set(query, [])
        }
      }

      if (totalAds === 0) {
        console.error('No ads found for any query.')
        process.exit(0)
      }

      const pivot = buildPivotData(adsByQuery)
      console.log(formatPivotTable(pivot))

      // Per-query histograms on stderr
      for (const [query, ads] of adsByQuery) {
        if (ads.length === 0) continue
        const prices = ads.map(a => a.price).filter(p => p > 0)
        if (prices.length === 0) continue
        console.error('')
        console.error(`  "${query}"`)
        console.error(formatHistogram(prices, Math.min(10, prices.length)))
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`Error: ${message}`)
      process.exit(1)
    }
  })

program.addHelpText('after', `
Commands & Options
──────────────────

  search [query]
    -u, --url <url>            Use a raw OLX search URL instead of building one
    -c, --category <cat>       Category slug (e.g. informatica, imoveis, eletronicos)
    --min-price <n>            Minimum price filter (R$)
    --max-price <n>            Maximum price filter (R$)
    --condition <new|used>     Condition filter
    --filter-substring <text>  Exclude ads whose title contains this text
    -p, --pages <n>            Number of pages to fetch (default: 1)
    -l, --limit <n>            Maximum number of ads to return
    -f, --format <format>      Output format: table (default), json, csv
    -s, --sort <sort>          Sort results: price-asc, price-desc, date

  multisearch <queries...>
    -c, --category <cat>       Category slug (e.g. informatica, imoveis, eletronicos)
    --min-price <n>            Minimum price filter (R$)
    --max-price <n>            Maximum price filter (R$)
    --condition <new|used>     Condition filter
    --filter-substring <text>  Exclude ads whose title contains this text
    -p, --pages <n>            Pages per search (default: 1)
    -l, --limit <n>            Max ads per search
    -s, --sort <sort>          Sort results: price-asc, price-desc, date

Examples
────────

  olx search "rtx 4090"
  olx search "playstation 5" --min-price 2000 --max-price 3500 --condition used
  olx search "macbook pro" --pages 3 --format json
  olx search --url "https://www.olx.com.br/informatica/placas-de-video?q=rtx+4090"
  olx search "iphone" --category eletronicos --sort price-asc
  olx multisearch "iphone 15" "iphone 14" "iphone 13" --pages 1 --limit 10
`)

program.parse()
