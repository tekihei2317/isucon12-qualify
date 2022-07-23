import { ErrorWithStatus, PlayerRow, CompetitionRow } from '../type'
import { open, Database } from 'sqlite'

export function getEnv(key: string, defaultValue: string): string {
  const val = process.env[key]
  if (val !== undefined) {
    return val
  }

  return defaultValue
}

export async function retrievePlayer(tenantDB: Database, id: string): Promise<PlayerRow | undefined> {
  try {
    const playerRow = await tenantDB.get<PlayerRow>('SELECT * FROM player WHERE id = ?', id)
    return playerRow
  } catch (error) {
    throw new Error(`error Select player: id=${id}, ${error}`)
  }
}

export async function authorizePlayer(tenantDB: Database, id: string): Promise<Error | undefined> {
  try {
    const player = await retrievePlayer(tenantDB, id)
    if (!player) {
      throw new ErrorWithStatus(401, 'player not found')
    }
    if (player.is_disqualified) {
      throw new ErrorWithStatus(403, 'player is disqualified')
    }
    return
  } catch (error) {
    return error as Error
  }
}

// 大会を取得する
export async function retrieveCompetition(tenantDB: Database, id: string): Promise<CompetitionRow | undefined> {
  try {
    const competitionRow = await tenantDB.get<CompetitionRow>('SELECT * FROM competition WHERE id = ?', id)
    return competitionRow
  } catch (error) {
    throw new Error(`error Select competition: id=${id}, ${error}`)
  }
}
