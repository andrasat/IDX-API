import * as Sync from '@app/Backend/Sync/index.ts'
import Logger from '@app/Logger.ts'

const dateStr = Deno.args[0] || new Date().toISOString().slice(0, 10).replace(/-/g, '')

async function run(name: string, fn: () => Promise<void>) {
  Logger.info(`[Daily] ${name}...`)
  try {
    await fn()
  } catch (e) {
    Logger.error(`[Daily] ${name} failed:`, e instanceof Error ? e.message : String(e))
  }
}

async function main() {
  Logger.info(`[Daily] Starting daily sync for ${dateStr}`)

  await run('syncTradeSummary', Sync.syncTradeSummary)
  await run('syncIndexList', Sync.syncIndexList)
  await run('syncCompanySuspend', Sync.syncCompanySuspend)
  await run('syncStockScreener', Sync.syncStockScreener)

  await run(`syncStockSummary(${dateStr})`, () => Sync.syncStockSummary(dateStr))
  await run(`syncBrokerSummary(${dateStr})`, () => Sync.syncBrokerSummary(dateStr))
  await run(`syncIndexSummary(${dateStr})`, () => Sync.syncIndexSummary(dateStr))
  await run(`syncCompanyAnnouncement(${dateStr})`, () => Sync.syncCompanyAnnouncement(dateStr))
  await run(`syncMarketCalendar(${dateStr})`, () => Sync.syncMarketCalendar(dateStr))

  Logger.info('[Daily] Sync complete.')
}

main()
