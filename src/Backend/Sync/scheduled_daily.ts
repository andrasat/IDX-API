import * as Sync from '@app/Backend/Sync/index.ts'
import Logger from '@app/Logger.ts'

const DAYS_TO_SYNC = 7

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return formatDate(d)
}

async function run(name: string, fn: () => Promise<void>) {
  Logger.info(`[Daily] ${name}...`)
  try {
    await fn()
  } catch (e) {
    Logger.error(`[Daily] ${name} failed:`, e instanceof Error ? e.message : String(e))
  }
}

async function main() {
  const dates: string[] = []
  for (let i = 1; i <= DAYS_TO_SYNC; i++) {
    dates.push(daysAgo(i))
  }
  Logger.info(`[Daily] Syncing last ${DAYS_TO_SYNC} days: ${dates.join(', ')}`)

  await run('syncTradeSummary', Sync.syncTradeSummary)
  await run('syncIndexList', Sync.syncIndexList)
  await run('syncCompanySuspend', Sync.syncCompanySuspend)
  await run('syncStockScreener', Sync.syncStockScreener)

  for (const dateStr of dates) {
    await run(`syncStockSummary(${dateStr})`, () => Sync.syncStockSummary(dateStr))
    await run(`syncBrokerSummary(${dateStr})`, () => Sync.syncBrokerSummary(dateStr))
    await run(`syncIndexSummary(${dateStr})`, () => Sync.syncIndexSummary(dateStr))
    await run(`syncCompanyAnnouncement(${dateStr})`, () => Sync.syncCompanyAnnouncement(dateStr))
    await run(`syncMarketCalendar(${dateStr})`, () => Sync.syncMarketCalendar(dateStr))
  }

  Logger.info('[Daily] Sync complete.')
}

main()
