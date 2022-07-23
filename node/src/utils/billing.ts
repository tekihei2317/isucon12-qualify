// import { open, Database } from 'sqlite'

// export type BillingReport = {
//   competition_id: string
//   competition_title: string
//   player_count: number // スコアを登録した参加者数
//   visitor_count: number // ランキングを閲覧だけした(スコアを登録していない)参加者数
//   billing_player_yen: number // 請求金額 スコアを登録した参加者分
//   billing_visitor_yen: number // 請求金額 ランキングを閲覧だけした(スコアを登録していない)参加者分
//   billing_yen: number // 合計請求金額
// }

// // ToDo
// // 大会ごとの課金レポートを計算する
// export async function billingReportByCompetition(
//   tenantDB: Database,
//   tenantId: number,
//   competitionId: string
// ): Promise<BillingReport> {
//   const comp = await retrieveCompetition(tenantDB, competitionId)
//   if (!comp) {
//     throw Error('error retrieveCompetition on billingReportByCompetition')
//   }

//   const billingMap: { [playerId: string]: 'player' | 'visitor' } = {}
  
//   // let query: string, array: [number, string, number?];
//   // if (comp.finished_at === null){
//   //   query = 'SELECT COUNT(DISTINCT(player_id)) AS visitor_count FROM visit_history WHERE tenant_id = ? AND competition_id = ?';
//   //   array = [tenantId, comp.id];
//   // }else{
//   //   query = 'SELECT COUNT(DISTINCT(player_id)) AS visitor_count FROM visit_history WHERE tenant_id = ? AND competition_id = ? AND created_at > ?';
//   //   array = [tenantId, comp.id, comp.finished_at];
//   // }
//   // const [query_visitors] = await adminDB.query<({ player_count: number })[]>(query, array)

//   // const [query_players] = await tenantDB.all<({ player_count: number })[]>(
//   //   'SELECT COUNT(DISTINCT(player_id)) as player_count FROM player_score WHERE tenant_id = ? AND competition_id = ?',
//   //   [tenantId, comp.id]
//   // )

//   // const visitors = query_visitors[0].visitor_count;
//   // const players = query_players.player_count;
//   // console.log("visitors: "+JSON.stringify(query_visitors));
//   // console.log("players: "+JSON.stringify(query_players));
//   // console.log("visitors[0]: "+visitors);
//   // console.log("players[0]: "+players);

//   // ランキングにアクセスした参加者のIDを取得する
//   const [vhs] = await adminDB.query<(VisitHistorySummaryRow & RowDataPacket)[]>(
//     'SELECT player_id, MIN(created_at) AS min_created_at FROM visit_history WHERE tenant_id = ? AND competition_id = ? GROUP BY player_id',
//     [tenantId, comp.id]
//   )

//   // ToDo remove for
//   for (const vh of vhs) {
//     // competition.finished_atよりもあとの場合は、終了後に訪問したとみなして大会開催内アクセス済みとみなさない
//     if (comp.finished_at !== null && comp.finished_at < vh.min_created_at) {
//       continue
//     }
//     billingMap[vh.player_id] = 'visitor'
//   }

//   // player_scoreを読んでいるときに更新が走ると不整合が起こるのでロックを取得する
//   const unlock = await flockByTenantID(tenantId)
//   // ToDo possible query unite?
//   try {
//     // スコアを登録した参加者のIDを取得する
//     const scoredPlayerIds = await tenantDB.all<{ player_id: string }[]>(
//       'SELECT DISTINCT(player_id) FROM player_score WHERE tenant_id = ? AND competition_id = ?',
//       tenantId,
//       comp.id
//     )
//     // ToDo remove for
//     for (const pid of scoredPlayerIds) {
//       // スコアが登録されている参加者
//       billingMap[pid.player_id] = 'player'
//     }

//     // 大会が終了している場合のみ請求金額が確定するので計算する
//     const counts = {
//       player: 0,
//       visitor: 0,
//     }
//     if (comp.finished_at) {
//       // ToDo remove for
//       for (const category of Object.values(billingMap)) {
//         switch (category) {
//           case 'player':
//             counts.player++
//             break
//           case 'visitor':
//             counts.visitor++
//             break
//         }
//       }
//     }

//     return {
//       competition_id: comp.id,
//       competition_title: comp.title,
//       player_count: counts.player,
//       visitor_count: counts.visitor,
//       billing_player_yen: 100 * counts.player,
//       billing_visitor_yen: 10 * counts.visitor,
//       billing_yen: 100 * counts.player + 10 * counts.visitor,
//     }
//     // return {
//     //   competition_id: comp.id,
//     //   competition_title: comp.title,
//     //   player_count: players,
//     //   visitor_count: visitors,
//     //   billing_player_yen: 100 * players,
//     //   billing_visitor_yen: 10 * players,
//     //   billing_yen: 100 * players + 10 * visitors,
//     // }
//   } catch (error) {
//     throw new Error(`error Select count player_score: tenantId=${tenantId}, competitionId=${comp.id}, ${error}`)
//   } finally {
//     unlock()
//   }
// }
