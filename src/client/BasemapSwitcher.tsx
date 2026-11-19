import { useState } from 'react'
import { BASE_MAPS, needsTiandituKey, type BaseMapDef } from '../basemaps.js'
import type { WebgisT } from './webgis-i18n.js'
import styles from './webgis.module.css'

/**
 * 左下角底图切换器：按钮显示当前底图，点击弹出按「矢量 / 影像」分组的目录。
 * 纯展示组件，切换动作由上层（MapView）执行。
 * 分组标签与名称显示走 t；`src/basemaps.ts` 里的 category/name 数据不动
 * （tests 锁定，且切换按 id 引用）——只映射少数中文名（default / esri-imagery / tianditu-vec），
 * 其余已是英文、直接显示 name。
 * 需密钥的底图（天地图，URL 含 {tk} 占位）：未配置 tiandituKey 时条目置灰不可点，
 * hover 提示去插件配置里填 key，避免切过去拉一堆 401 瓦片。
 */
export function BasemapSwitcher({ baseMap, onSwitch, tiandituKey = '', tiandituServices, t }: {
  baseMap: BaseMapDef
  onSwitch: (def: BaseMapDef) => void
  /** 天地图密钥（/webgis/state 下发）；空串 = 未配置。 */
  tiandituKey?: string
  /** 设置页选择启用的天地图服务；默认都启用，兼容尚未下发该字段的旧 host。 */
  tiandituServices?: { vector: boolean; imagery: boolean }
  t: WebgisT
}): JSX.Element {
  const [open, setOpen] = useState(false)
  const groups = ['矢量', '影像'] as const
  const enabledVector = tiandituServices?.vector ?? true
  const enabledImagery = tiandituServices?.imagery ?? true
  /** 分组头：category 是数据键，展示走词典。 */
  const groupLabel = (g: string): string => (g === '矢量' ? t('basemap.groupVector') : t('basemap.groupImagery'))
  /** 底图名：少数中文名映射到词典，其余原样。 */
  const baseName = (d: BaseMapDef): string => (
    d.id === 'default' ? t('basemap.default')
      : d.id === 'esri-imagery' ? t('basemap.esriImagery')
        : d.id === 'tianditu-vec' ? t('basemap.tiandituVec')
          : d.id === 'tianditu-img' ? t('basemap.tiandituImg')
            : d.name
  )
  /** 设置页取消勾选的天地图服务不出现在切换器中。 */
  const serviceEnabled = (d: BaseMapDef): boolean => (
    d.id !== 'tianditu-vec' || enabledVector
  ) && (d.id !== 'tianditu-img' || enabledImagery)
  return (
    <div className={styles.baseSwitcher}>
      <button
        type="button"
        className={styles.baseSwitcherBtn}
        onClick={() => setOpen(!open)}
        title={t('basemap.switchTitle')}
      >
        {baseName(baseMap)}
      </button>
      {open && (
        <div className={styles.baseSwitcherPanel}>
          {groups.map((g) => {
            const items = BASE_MAPS.filter((d) => d.category === g && serviceEnabled(d))
            if (items.length === 0) return null
            return (
              <div key={g}>
                <div className={styles.baseSwitcherGroupLabel}>{groupLabel(g)}</div>
                {items.map((d) => {
                  const locked = needsTiandituKey(d) && !tiandituKey
                  return (
                    <button
                      key={d.id}
                      type="button"
                      className={`${styles.baseSwitcherItem}${d.id === baseMap.id ? ` ${styles.baseSwitcherItemActive}` : ''}`}
                      disabled={locked}
                      title={locked ? t('basemap.needTiandituKey') : undefined}
                      onClick={() => {
                        if (locked) return
                        onSwitch(d)
                        setOpen(false)
                      }}
                    >
                      {baseName(d)}
                      {locked ? ` 🔒` : ''}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
