import * as Sync from '@app/Backend/Sync/index.ts'
import Logger from '@app/Logger.ts'

const year = parseInt(Deno.args[0] || String(new Date().getFullYear()), 10)
const month = parseInt(Deno.args[1] || String(new Date().getMonth()), 10)

const DELAY = 400

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

async function run(name: string, fn: () => Promise<void>) {
  Logger.info(`[Monthly] ${name}...`)
  try {
    await fn()
  } catch (e) {
    Logger.error(`[Monthly] ${name} failed:`, e instanceof Error ? e.message : String(e))
  }
  await delay(DELAY)
}

async function main() {
  Logger.info(`[Monthly] Starting monthly sync for ${year}-${month}`)

  await run('syncDailyIndex', () => Sync.syncDailyIndex(year, month))
  await run('syncForeignTrading', () => Sync.syncForeignTrading(year, month))
  await run('syncDomesticTrading', () => Sync.syncDomesticTrading(year, month))
  await run('syncFinancialRatio', () => Sync.syncFinancialRatio(year, month))
  await run('syncTopGainer', () => Sync.syncTopGainer(year, month))
  await run('syncTopLoser', () => Sync.syncTopLoser(year, month))
  await run('syncIndustryTrading', () => Sync.syncIndustryTrading(year, month))
  await run('syncSectoralMovement', () => Sync.syncSectoralMovement(year, month))
  await run('syncActiveVolume', () => Sync.syncActiveVolume(year, month))
  await run('syncActiveFrequency', () => Sync.syncActiveFrequency(year, month))
  await run('syncActiveValue', () => Sync.syncActiveValue(year, month))
  await run('syncAdditionalListing', () => Sync.syncAdditionalListing(year, month))
  await run('syncCompanyDelisting', () => Sync.syncCompanyDelisting(year, month))
  await run('syncCompanyDividend', () => Sync.syncCompanyDividend(year, month))
  await run('syncNewListing', () => Sync.syncNewListing(year, month))
  await run('syncRightOffering', () => Sync.syncRightOffering(year, month))
  await run('syncStockSplit', () => Sync.syncStockSplit(year, month))

  Logger.info('[Monthly] Sync complete.')
}

main()
