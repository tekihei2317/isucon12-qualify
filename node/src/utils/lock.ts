import { getEnv } from './'
import path from 'path'
import { openSync, closeSync } from 'fs'
import util from 'util'
import fsExt from 'fs-ext'

const flock = util.promisify(fsExt.flock)

async function asyncSleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

// 排他ロックのためのファイル名を生成する
function lockFilePath(tenantId: number): string {
  const tenantDBDir = getEnv('ISUCON_TENANT_DB_DIR', '../tenant_db')
  return path.join(tenantDBDir, `${tenantId}.lock`)
}

// 排他ロックする
export async function flockByTenantID(tenantId: number): Promise<() => Promise<void>> {
  const p = lockFilePath(tenantId)

  const fd = openSync(p, 'w+')
  for (;;) {
    try {
      await flock(fd, fsExt.constants.LOCK_EX | fsExt.constants.LOCK_NB)
    } catch (error: any) {
      if (error.code === 'EAGAIN' && error.errno === 11) {
        await asyncSleep(10)
        continue
      }
      throw new Error(`error flock: path=${p}, ${error}`)
    }
    break
  }

  const close = async () => {
    await flock(fd, fsExt.constants.LOCK_UN)
    closeSync(fd)
  }
  return close
}
