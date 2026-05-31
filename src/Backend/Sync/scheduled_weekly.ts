import Database from '@app/Database.ts'
import * as schemas from '@app/Backend/Schemas/index.ts'
import * as Sync from '@app/Backend/Sync/index.ts'
import Logger from '@app/Logger.ts'

const DELAY = 400

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

async function run(name: string, fn: () => Promise<void>) {
  Logger.info(`[Weekly] ${name}...`)
  try {
    await fn()
  } catch (e) {
    Logger.error(`[Weekly] ${name} failed:`, e instanceof Error ? e.message : String(e))
  }
  await delay(DELAY)
}

async function main() {
  Logger.info('[Weekly] Starting weekly reference sync.')

  await run('syncCompanyProfile', Sync.syncCompanyProfile)
  await run('syncSecurityStock', Sync.syncSecurityStock)
  await run('syncCompanyRelisting', Sync.syncCompanyRelisting)
  await run('syncBrokerParticipant', Sync.syncBrokerParticipant)
  await run('syncDealerParticipant', Sync.syncDealerParticipant)
  await run('syncProfileParticipant', Sync.syncProfileParticipant)

  Logger.info('[Weekly] Starting per-company sync for all listed companies.')
  const companies = await Database.select({ code: schemas.companyProfile.code }).from(schemas.companyProfile)

  for (let i = 0; i < companies.length; i++) {
    const code = companies[i]?.code
    if (!code) continue
    Logger.info(`[Weekly] ${i + 1}/${companies.length}: ${code}`)

    await run(`syncTradingDaily(${code})`, () => Sync.syncTradingDaily(code))
    await run(`syncIssuedHistory(${code})`, () => Sync.syncIssuedHistory(code))
    await run(`syncProfileAnnouncement(${code})`, () => Sync.syncProfileAnnouncement(code))
  }

  Logger.info('[Weekly] Sync complete.')
}

main()
