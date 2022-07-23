import { Request } from 'express'
import { ErrorWithStatus, Viewer, RoleAdmin, RoleOrganizer, RolePlayer, TenantRow  } from '../type'
import { getEnv } from './index'
import { readFile } from 'fs/promises'
import jwt from 'jsonwebtoken'
import { RowDataPacket } from 'mysql2/promise'
import { adminDB } from './database'

const cookieName = 'isuports_session'

export async function retrieveTenantRowFromHeader(req: Request): Promise<TenantRow | undefined> {
  // JWTに入っているテナント名とHostヘッダのテナント名が一致しているか確認
  const baseHost = getEnv('ISUCON_BASE_HOSTNAME', '.t.isucon.dev')
  const tenantName = req.hostname.replace(baseHost, '')

  // SaaS管理者用ドメイン
  if (tenantName === 'admin') {
    return {
      id: 0,
      name: 'admin',
      display_name: 'admin',
    }
  }

  // テナントの存在確認
  try {
    const [[tenantRow]] = await adminDB.query<(TenantRow & RowDataPacket)[]>('SELECT * FROM tenant WHERE name = ?', [
      tenantName,
    ])
    return tenantRow
  } catch (error) {
    throw new Error(`failed to Select tenant: name=${tenantName}, ${error}`)
  }
}

export async function parseViewer(req: Request): Promise<Viewer> {
  const tokenStr = req.cookies[cookieName]
  if (!tokenStr) {
    throw new ErrorWithStatus(401, `cookie ${cookieName} is not found`)
  }

  const keyFilename = getEnv('ISUCON_JWT_KEY_FILE', '../public.pem')
  const cert = await readFile(keyFilename)

  let token: jwt.JwtPayload
  try {
    token = jwt.verify(tokenStr, cert, {
      algorithms: ['RS256'],
    }) as jwt.JwtPayload
  } catch (error) {
    throw new ErrorWithStatus(401, `${error}`)
  }

  if (!token.sub) {
    throw new ErrorWithStatus(401, `invalid token: subject is not found in token: ${tokenStr}`)
  }
  const subject = token.sub

  const tr: string | undefined = token['role']
  if (!tr) {
    throw new ErrorWithStatus(401, `invalid token: role is not found: ${tokenStr}`)
  }

  let role = ''
  switch (tr) {
    case RoleAdmin:
    case RoleOrganizer:
    case RolePlayer:
      role = tr
      break

    default:
      throw new ErrorWithStatus(401, `invalid token: invalid role: ${tokenStr}"`)
  }

  // aud は1要素で、テナント名が入っている
  const aud: string[] | undefined = token.aud as string[]
  if (!aud || aud.length !== 1) {
    throw new ErrorWithStatus(401, `invalid token: aud field is few or too much: ${tokenStr}`)
  }

  const tenant = await retrieveTenantRowFromHeader(req)
  if (!tenant) {
    throw new ErrorWithStatus(401, 'tenant not found')
  }
  if (tenant.name === 'admin' && role !== RoleAdmin) {
    throw new ErrorWithStatus(401, 'tenant not found')
  }
  if (tenant.name !== aud[0]) {
    throw new ErrorWithStatus(401, `invalid token: tenant name is not match with ${req.hostname}: ${tokenStr}`)
  }

  return {
    role: role,
    playerId: subject,
    tenantName: tenant.name,
    tenantId: tenant.id ?? 0,
  }
}
