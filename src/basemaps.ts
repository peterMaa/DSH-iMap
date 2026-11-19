/**
 * 底图目录 + 切换决策（纯函数，host 侧编译，客户端经 bundle 边界复用）。
 *
 * 编码策略：内置矢量底图只选「自带 maplibre 兼容 v8 style.json + MVT 瓦片」的图源，
 * 切换时 `map.setStyle(styleUrl)` 让图源自带样式渲染自家瓦片——图层 schema / extent 差异
 * 由图源自洽 + maplibre 读瓦片内 extent 自动适配。影像底图为光栅瓦片，只换瓦片 URL。
 */

/**
 * Carto 默认光栅瓦片（light_all）真实图源。Carto 对未带 API key 的瓦片叠「API key required」水印；
 * 用 `?key=` 传账号 key 去水印（服务端只认 `key`，`api_key`/`apikey` 会被当未知参数忽略）。
 * ⚠️ key 属部署账号私有——发布公共 npm 前必须移出到部署配置/环境，勿随源码/产物分发。
 */
export const CARTO_LIGHT_TILES = 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=cb1_2ynp_1_f4210333ac56345b838752b4'

export interface BaseMapDef {
  id: string
  name: string
  /** 切换器分组：矢量 = 街道/矢量样式；影像 = 卫星/光栅。 */
  category: '矢量' | '影像'
  /** raster = 光栅瓦片（换 base 源瓦片 URL，或重载光栅样式）；style = 矢量瓦片样式（setStyle URL）。 */
  kind: 'raster' | 'style'
  /** 瓦片模板 URL 或 style.json URL；`default` 条目留空，apply 时用 config.baseTileUrl 填入。 */
  url: string
  /**
   * 注记瓦片模板（如天地图 cva_w 矢量注记）：存在时光栅底图由 base + base-label 两个源叠成。
   * 仅 kind='raster' 有意义。
   */
  labelUrl?: string
  tileSize?: number
  attribution?: string
}

/**
 * 天地图公共服务平台 XYZ 瓦片（球面墨卡托 w 系列），需账号密钥 tk（https://console.tianditu.gov.cn 申请）。
 * `{tk}` 占位在 apply 时用 config.tiandituKey 填充；二级域名 t0-t7 等价，固定 t0。
 */
export const TIANDITU_VEC_TILES = 'https://t0.tianditu.gov.cn/DataServer?T=vec_w&x={x}&y={y}&l={z}&tk={tk}'
export const TIANDITU_CVA_TILES = 'https://t0.tianditu.gov.cn/DataServer?T=cva_w&x={x}&y={y}&l={z}&tk={tk}'
export const TIANDITU_IMG_TILES = 'https://t0.tianditu.gov.cn/DataServer?T=img_w&x={x}&y={y}&l={z}&tk={tk}'
export const TIANDITU_CIA_TILES = 'https://t0.tianditu.gov.cn/DataServer?T=cia_w&x={x}&y={y}&l={z}&tk={tk}'

export const BASE_MAPS: BaseMapDef[] = [
  // ---- 矢量（街道 / 矢量瓦片样式） ----
  { id: 'default', name: 'Carto 浅色（默认）', category: '矢量', kind: 'raster', url: '' },
  { id: 'carto-positron', name: 'Carto Positron', category: '矢量', kind: 'style', url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json' },
  { id: 'carto-dark', name: 'Carto Dark Matter', category: '矢量', kind: 'style', url: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json' },
  { id: 'carto-voyager', name: 'Carto Voyager', category: '矢量', kind: 'style', url: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json' },
  { id: 'openfreemap-liberty', name: 'OpenFreeMap Liberty', category: '矢量', kind: 'style', url: 'https://tiles.openfreemap.org/styles/liberty' },
  { id: 'tianditu-vec', name: '天地图矢量', category: '矢量', kind: 'raster', url: TIANDITU_VEC_TILES, labelUrl: TIANDITU_CVA_TILES, tileSize: 256, attribution: '© 天地图' },
  // ---- 影像（光栅卫星） ----
  { id: 'tianditu-img', name: '天地图影像', category: '影像', kind: 'raster', url: TIANDITU_IMG_TILES, labelUrl: TIANDITU_CIA_TILES, tileSize: 256, attribution: '© 天地图' },
  { id: 'esri-imagery', name: 'Esri 全球影像', category: '影像', kind: 'raster', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', tileSize: 256 },
]

/** 该底图的瓦片 URL 是否需要天地图密钥（含 `{tk}` 占位）。 */
export function needsTiandituKey(def: BaseMapDef): boolean {
  return def.url.includes('{tk}') || (def.labelUrl?.includes('{tk}') ?? false)
}

/** 填充 `{tk}` 占位；无占位时原样返回。 */
export function fillTiandituKey(url: string, tiandituKey: string): string {
  return url.replaceAll('{tk}', tiandituKey)
}

export type BaseMapAction =
  | { kind: 'setTiles'; url: string; labelUrl?: string }
  | { kind: 'setStyleRaster'; url: string; labelUrl?: string }
  | { kind: 'setStyleUrl'; url: string }

/**
 * 依据底图定义与当前样式里的源，决定切换动作。
 * 光栅底图带注记（labelUrl）时，当前样式必须也有 base-label 源才能只换瓦片（setTiles）；
 * 注记有无不匹配（esri ↔ tianditu 互切）时整样式重建（setStyleRaster），靠 diff:false 全量增删源。
 */
export function baseMapAction(def: BaseMapDef, hasBaseSource: boolean, hasLabelSource = false): BaseMapAction {
  if (def.kind === 'style') return { kind: 'setStyleUrl', url: def.url }
  const extra = def.labelUrl ? { labelUrl: def.labelUrl } : {}
  const canSwap = hasBaseSource && hasLabelSource === (def.labelUrl != null)
  return canSwap
    ? { kind: 'setTiles', url: def.url, ...extra }
    : { kind: 'setStyleRaster', url: def.url, ...extra }
}
