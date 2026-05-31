import Database from '@app/Database.ts'
import * as schemas from '@app/Backend/Schemas/index.ts'
import * as Sync from '@app/Backend/Sync/index.ts'
import Logger from '@app/Logger.ts'

const DAYS_TO_SYNC = 7
const STATE_FILE = import.meta.dirname + '/../../data/.sync_state.json'

type Phase = 'daily' | 'reference' | 'per_company' | 'monthly' | 'done'

interface SyncState {
  runDate: string
  phase: Phase
  lastCompanyIndex: number
  companiesTotal: number
  completed: boolean
  monthlyDone: boolean
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return formatDate(d)
}

async function readState(): Promise<SyncState> {
  try {
    const raw = await Deno.readTextFile(STATE_FILE)
    return JSON.parse(raw)
  } catch {
    return { runDate: '', phase: 'daily', lastCompanyIndex: 0, companiesTotal: 0, completed: false, monthlyDone: false }
  }
}

async function writeState(state: SyncState): Promise<void> {
  try {
    await Deno.writeTextFile(STATE_FILE, JSON.stringify(state, null, 2))
  } catch (e) {
    Logger.error(`[Sync] Failed to write state: ${e instanceof Error ? e.message : String(e)}`)
  }
}

async function main() {
  const today = new Date()
  const isMonthly = Deno.args.includes('--monthly') || today.getDate() === 2
  const runDate = todayStr()

  let state = await readState()

  if (state.runDate !== runDate || state.completed) {
    state = { runDate, phase: 'daily', lastCompanyIndex: 0, companiesTotal: 0, completed: false, monthlyDone: false }
    Logger.info(`[Sync] Starting fresh run for ${runDate}`)
  } else {
    Logger.info(`[Sync] Resuming ${runDate} from phase: ${state.phase} (company ${state.lastCompanyIndex}/${state.companiesTotal})`)
  }

  async function run(name: string, fn: () => Promise<void>) {
    Logger.info(`[Sync] ${name}...`)
    try {
      await fn()
    } catch (e) {
      Logger.error(`[Sync] ${name} failed:`, e instanceof Error ? e.message : String(e))
    }
  }

  const dates: string[] = []
  for (let i = 1; i <= DAYS_TO_SYNC; i++) {
    dates.push(daysAgo(i))
  }

  if (state.phase === 'daily') {
    Logger.info(`[Sync] === Daily data (last ${DAYS_TO_SYNC} days) ===`)
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

    state.phase = 'reference'
    await writeState(state)
  }

  if (state.phase === 'reference') {
    Logger.info('[Sync] === Reference data ===')
    await run('syncCompanyProfile', Sync.syncCompanyProfile)
    await run('syncSecurityStock', Sync.syncSecurityStock)
    await run('syncCompanyRelisting', Sync.syncCompanyRelisting)
    await run('syncBrokerParticipant', Sync.syncBrokerParticipant)
    await run('syncDealerParticipant', Sync.syncDealerParticipant)
    await run('syncProfileParticipant', Sync.syncProfileParticipant)

    const companies = await Database.select({ code: schemas.companyProfile.code }).from(schemas.companyProfile)
    state.companiesTotal = companies.length
    state.phase = 'per_company'
    state.lastCompanyIndex = 0
    await writeState(state)
  }

  if (state.phase === 'per_company') {
    const companies = await Database.select({ code: schemas.companyProfile.code }).from(schemas.companyProfile)
    Logger.info(`[Sync] === Per-company data (resuming at ${state.lastCompanyIndex + 1}/${companies.length}) ===`)

    for (let i = state.lastCompanyIndex; i < companies.length; i++) {
      const code = companies[i]?.code
      if (!code) continue
      Logger.info(`[Sync] ${i + 1}/${companies.length}: ${code}`)
      await run(`syncTradingDaily(${code})`, () => Sync.syncTradingDaily(code))

      if ((i + 1) % 50 === 0 || i === companies.length - 1) {
        state.lastCompanyIndex = i + 1
        await writeState(state)
      }
    }

    state.lastCompanyIndex = companies.length
    state.phase = 'monthly'
    await writeState(state)
  }

  if (state.phase === 'monthly' && isMonthly && !state.monthlyDone) {
    const y = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear()
    const m = today.getMonth() === 0 ? 12 : today.getMonth()
    Logger.info(`[Sync] === Monthly data (${y}-${m}) ===`)
    await run('syncDailyIndex', () => Sync.syncDailyIndex(y, m))
    await run('syncForeignTrading', () => Sync.syncForeignTrading(y, m))
    await run('syncDomesticTrading', () => Sync.syncDomesticTrading(y, m))
    await run('syncFinancialRatio', () => Sync.syncFinancialRatio(y, m))
    await run('syncTopGainer', () => Sync.syncTopGainer(y, m))
    await run('syncTopLoser', () => Sync.syncTopLoser(y, m))
    await run('syncIndustryTrading', () => Sync.syncIndustryTrading(y, m))
    await run('syncSectoralMovement', () => Sync.syncSectoralMovement(y, m))
    await run('syncActiveVolume', () => Sync.syncActiveVolume(y, m))
    await run('syncActiveFrequency', () => Sync.syncActiveFrequency(y, m))
    await run('syncActiveValue', () => Sync.syncActiveValue(y, m))
    await run('syncAdditionalListing', () => Sync.syncAdditionalListing(y, m))
    await run('syncCompanyDelisting', () => Sync.syncCompanyDelisting(y, m))
    await run('syncCompanyDividend', () => Sync.syncCompanyDividend(y, m))
    await run('syncNewListing', () => Sync.syncNewListing(y, m))
    await run('syncRightOffering', () => Sync.syncRightOffering(y, m))
    await run('syncStockSplit', () => Sync.syncStockSplit(y, m))

    state.monthlyDone = true
    await writeState(state)
  }

  state.completed = true
  await writeState(state)
  Logger.info(`[Sync] Complete. State saved to ${STATE_FILE}`)
}

main()
