import Database from '@app/Database.ts'
import * as schemas from '@app/Backend/Schemas/index.ts'
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
  Logger.info(`[Sync] ${name}...`)
  try {
    await fn()
  } catch (e) {
    Logger.error(`[Sync] ${name} failed:`, e instanceof Error ? e.message : String(e))
  }
}

async function main() {
  const dates: string[] = []
  for (let i = 1; i <= DAYS_TO_SYNC; i++) {
    dates.push(daysAgo(i))
  }
  Logger.info(`[Sync] === Daily data (last ${DAYS_TO_SYNC} days: ${dates.join(', ')}) ===`)

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

  Logger.info('[Sync] === Reference data ===')
  await run('syncCompanyProfile', Sync.syncCompanyProfile)
  await run('syncSecurityStock', Sync.syncSecurityStock)
  await run('syncCompanyRelisting', Sync.syncCompanyRelisting)
  await run('syncBrokerParticipant', Sync.syncBrokerParticipant)
  await run('syncDealerParticipant', Sync.syncDealerParticipant)
  await run('syncProfileParticipant', Sync.syncProfileParticipant)

  Logger.info('[Sync] === Per-company data ===')
  const companies = await Database.select({ code: schemas.companyProfile.code }).from(schemas.companyProfile)

  for (let i = 0; i < companies.length; i++) {
    const code = companies[i]?.code
    if (!code) continue
    Logger.info(`[Sync] ${i + 1}/${companies.length}: ${code}`)
    await run(`syncTradingDaily(${code})`, () => Sync.syncTradingDaily(code))
  }

  Logger.info('[Sync] Complete.')
}

main()
