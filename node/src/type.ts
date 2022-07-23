export { RowDataPacket, OkPacket } from 'mysql2/promise'

export class ErrorWithStatus extends Error {
  public status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = new.target.name
    this.status = status
  }
}

export type CompetitionDetail = {
  id: string
  title: string
  is_finished: boolean
}

export type CompetitionRank = {
  rank: number
  score: number
  player_id: string
  player_display_name: string
}

export type Viewer = {
  role: string
  playerId: string
  tenantName: string
  tenantId: number
}

export const RoleAdmin = 'admin'
export const RoleOrganizer = 'organizer'
export const RolePlayer = 'player'
export const RoleNone = 'none'

// DB型定義
export interface TenantRow {
  id: number
  name: string
  display_name: string
  created_at?: number
  updated_at?: number
}

export interface CompetitionRow {
  tenant_id: number
  id: string
  title: string
  finished_at: number | null
  created_at: number
  updated_at: number
}

export interface VisitHistorySummaryRow {
  player_id: string
  min_created_at: number
}

export interface PlayerRow {
  tenant_id: number
  id: string
  display_name: string
  is_disqualified: number
  created_at: number
  updated_at: number
}

export interface PlayerScoreRow {
  tenant_id: number
  id: string
  player_id: string
  competition_id: string
  score: number
  row_num: number
  created_at: number
  updated_at: number
}

export type WithRowNum = {
  row_num: number
}
