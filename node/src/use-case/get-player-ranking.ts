import { Request, Response } from 'express'
import { ErrorWithStatus, CompetitionDetail, CompetitionRank, RolePlayer, TenantRow, RowDataPacket, OkPacket, PlayerScoreRow, WithRowNum  } from '../type'
import  { parseViewer } from '../utils/request'
import { adminDB, connectToTenantDB } from '../utils/database'
import { authorizePlayer, retrievePlayer, retrieveCompetition } from '../utils'
import { flockByTenantID } from '../utils/lock'

type CompetitionRankingResult = {
  competition: CompetitionDetail
  ranks: CompetitionRank[]
}

interface JoinedPlayerScoreRow {
  player_id: string
  score: number
  row_num: number
  display_name: string
}

export async function getPlayerRanking (req: Request, res: Response)  {
  try {
    const viewer = await parseViewer(req)
    if (viewer.role !== RolePlayer) {
      throw new ErrorWithStatus(403, 'role player required')
    }

    const { competitionId } = req.params
    if (!competitionId) {
      throw new ErrorWithStatus(400, 'competition_id is required')
    }

    let cd: CompetitionDetail
    const ranks: CompetitionRank[] = []
    const tenantDB = await connectToTenantDB(viewer.tenantId)
    try {
      const error = await authorizePlayer(tenantDB, viewer.playerId)
      if (error) {
        throw error
      }

      const competition = await retrieveCompetition(tenantDB, competitionId)
      if (!competition) {
        throw new ErrorWithStatus(404, 'competition not found')
      }
      cd = {
        id: competition.id,
        title: competition.title,
        is_finished: !!competition.finished_at,
      }

      const now = Math.floor(new Date().getTime() / 1000)
      const [[tenant]] = await adminDB.query<(TenantRow & RowDataPacket)[]>('SELECT * FROM tenant WHERE id = ?', [
        viewer.tenantId,
      ])

      await adminDB.execute<OkPacket>(
        'INSERT INTO visit_history (player_id, tenant_id, competition_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [viewer.playerId, tenant.id, competitionId, now, now]
      )

      const { rank_after: rankAfterStr } = req.query
      let rankAfter: number
      if (rankAfterStr) {
        rankAfter = parseInt(rankAfterStr.toString(), 10)
      }

      // player_scoreを読んでいるときに更新が走ると不整合が起こるのでロックを取得する
      const unlock = await flockByTenantID(tenant.id)
      try {
        const pss = await tenantDB.all<JoinedPlayerScoreRow[]>(
          'SELECT ps.player_id as player_id, MAX(ps.row_num) as row_num, ps.score as score, player.display_name '+
          'FROM player_score AS ps LEFT JOIN player ON player.id = ps.player_id '+
          'WHERE ps.tenant_id = ? AND ps.competition_id = ? GROUP BY ps.player_id',
          tenant.id,
          competition.id
        )

        // const scoredPlayerSet: { [player_id: string]: number } = {}
        const tmpRanks: (CompetitionRank & WithRowNum)[] = []
        for (const ps of pss) {
          tmpRanks.push({
            rank: 0,
            score: ps.score,
            player_id: ps.player_id,
            player_display_name: ps.display_name,
            row_num: ps.row_num,
          })
        }

        tmpRanks.sort((a, b) => {
          if (a.score === b.score) {
            return a.row_num < b.row_num ? -1 : 1
          }
          return a.score > b.score ? -1 : 1
        })

        tmpRanks.forEach((rank, index) => {
          if (index < rankAfter) return
          if (ranks.length >= 100) return
          ranks.push({
            rank: index + 1,
            score: rank.score,
            player_id: rank.player_id,
            player_display_name: rank.player_display_name,
          })
        })
      } finally {
        unlock()
      }
    } finally {
      tenantDB.close()
    }

    const data: CompetitionRankingResult = {
      competition: cd,
      ranks,
    }
    res.status(200).json({
      status: true,
      data,
    })
  } catch (error: any) {
    if (error.status) {
      throw error // rethrow
    }
    throw new ErrorWithStatus(500, error)
  }
}