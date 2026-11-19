/**
 * 天地图配置：密钥只存 DSH 凭据存储（GUI 配置文件仅保留引用与服务选择）。
 * /webgis/state 下发完整 key 给地图瓦片使用；设置页 GET 只回掩码，避免明文回显。
 */

/** PostGIS 之外第二个凭据引用名（POSIX 标识符；同名环境变量也可直接提供密钥）。 */
export const TIANDITU_KEY_REF = 'WEBGIS_TIANDITU_KEY'

/** 生效配置：key 为内存中的完整值，永不回显到设置页。 */
export interface TiandituConfig {
  key: string
  /** 底图切换器是否显示天地图矢量。 */
  vector: boolean
  /** 底图切换器是否显示天地图影像。 */
  imagery: boolean
}

/** GUI 配置文件形状：只存凭据引用，不存明文密钥。 */
export interface TiandituStored {
  keyRef?: string
  vector?: boolean
  imagery?: boolean
}

/** 设置页可见的视图：密钥只保留前 4 位与后 4 位。 */
export interface TiandituView {
  keyMask: string
  keySet: boolean
  vector: boolean
  imagery: boolean
}

/** 掩码：长密钥显示「前 4 + **** + 后 4」，短密钥全部打码。 */
export function maskTiandituKey(key: string): string {
  if (!key) return ''
  if (key.length <= 8) return '****'
  return `${key.slice(0, 4)}****${key.slice(-4)}`
}

/** 内存配置 → 可安全下发浏览器的设置视图。 */
export function tiandituView(cfg: TiandituConfig): TiandituView {
  return {
    keyMask: maskTiandituKey(cfg.key),
    keySet: cfg.key.length > 0,
    vector: cfg.vector,
    imagery: cfg.imagery,
  }
}
