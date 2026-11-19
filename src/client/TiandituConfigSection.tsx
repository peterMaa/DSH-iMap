import { useEffect, useState } from 'react'
import { IconChevronDownOutlineMedium } from '@deepseek-ai/dsh-client-ui-primitives'
import type { WebgisT } from './webgis-i18n.js'
import styles from './webgis.module.css'

/** GET 返回的安全视图：密钥只有掩码，不回传明文。 */
interface TiandituView {
  keyMask: string
  keySet: boolean
  vector: boolean
  imagery: boolean
}

interface TiandituForm {
  key: string
  vector: boolean
  imagery: boolean
}

/**
 * IMap 设置卡片内的「天地图」子区：选择影像 / 矢量服务并填写自己的 key。
 * 保存后 GET 回显的是「前 4 + **** + 后 4」掩码；再次保存时留空或保持掩码即不修改密钥。
 * 数据走 /webgis/tianditu-config，明文密钥不经过设置页回显。
 */
export function TiandituConfigSection({ t }: { t: WebgisT }): JSX.Element {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<TiandituForm>({ key: '', vector: true, imagery: true })
  const [saved, setSaved] = useState<TiandituView>({ keyMask: '', keySet: false, vector: true, imagery: true })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/webgis/tianditu-config', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((cfg: TiandituView) => {
        if (cancelled) return
        const view: TiandituView = {
          keyMask: cfg.keyMask ?? '',
          keySet: !!cfg.keySet,
          vector: cfg.vector !== false,
          imagery: cfg.imagery !== false,
        }
        setSaved(view)
        setForm({ key: view.keyMask, vector: view.vector, imagery: view.imagery })
        setError('')
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const dirty = form.key !== saved.keyMask || form.vector !== saved.vector || form.imagery !== saved.imagery

  const save = async (): Promise<void> => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/webgis/tianditu-config', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      })
      const body = (await res.json().catch(() => ({}))) as TiandituView & { message?: string }
      if (!res.ok) throw new Error(body.message ?? `HTTP ${res.status}`)
      const view: TiandituView = {
        keyMask: body.keyMask ?? '',
        keySet: !!body.keySet,
        vector: body.vector !== false,
        imagery: body.imagery !== false,
      }
      setSaved(view)
      setForm({ key: view.keyMask, vector: view.vector, imagery: view.imagery })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const discard = (): void => {
    setForm({ key: saved.keyMask, vector: saved.vector, imagery: saved.imagery })
    setError('')
  }

  const serviceToggle = (label: string, checked: boolean, onChange: () => void): JSX.Element => (
    <div className={styles.settingsToggleRow}>
      <span className={styles.settingsToggleText}>
        <span className={styles.settingsToggleLabel}>{label}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        data-on={checked}
        className={styles.settingsSwitch}
        disabled={loading || saving}
        aria-label={label}
        onClick={onChange}
      />
    </div>
  )

  const blocked = !dirty || saving || loading

  return (
    <div className={styles.settingsSubsection}>
      <button
        type="button"
        className={styles.settingsHeader}
        aria-expanded={open}
        aria-label={`${open ? t('settings.collapse') : t('settings.expand')}: ${t('tianditu.cardName')}`}
        onClick={() => setOpen(!open)}
      >
        <span className={styles.settingsHeadText}>
          <span className={styles.settingsName}>{t('tianditu.cardName')}</span>
          <span className={styles.settingsDesc}>{t('tianditu.cardDesc')}</span>
        </span>
        {dirty && <span className={styles.settingsPending}>{t('settings.unsaved')}</span>}
        <IconChevronDownOutlineMedium
          className={open ? `${styles.settingsChevron} ${styles.settingsChevronOpen}` : styles.settingsChevron}
        />
      </button>
      {open && (
        <div className={styles.settingsBody}>
          {serviceToggle(t('tianditu.vectorLabel'), form.vector, () => setForm({ ...form, vector: !form.vector }))}
          <p className={styles.settingsHint}>{t('tianditu.vectorHint')}</p>
          {serviceToggle(t('tianditu.imageryLabel'), form.imagery, () => setForm({ ...form, imagery: !form.imagery }))}
          <p className={styles.settingsHint}>{t('tianditu.imageryHint')}</p>
          <div className={styles.settingsField}>
            <div className={styles.settingsFieldHead}>
              <label className={styles.settingsFieldLabel} htmlFor="webgis-tianditu-key">{t('tianditu.keyLabel')}</label>
            </div>
            <input
              id="webgis-tianditu-key"
              className={styles.settingsFieldInput}
              type="text"
              value={form.key}
              placeholder={t('tianditu.keyPh')}
              autoComplete="off"
              spellCheck={false}
              disabled={loading}
              onChange={(e) => setForm({ ...form, key: e.target.value })}
            />
            <p className={styles.settingsHint}>
              {t(saved.keySet ? 'tianditu.keyHintSet' : 'tianditu.keyHintEmpty')}
            </p>
          </div>
          <div className={styles.settingsFooter}>
            {error && <p className={styles.settingsFailed}>{error}</p>}
            <button type="button" className={styles.settingsDiscard} disabled={blocked} onClick={discard}>
              {t('settings.discard')}
            </button>
            <button type="button" className={styles.settingsSave} disabled={blocked} onClick={save}>
              {saving ? t('settings.saving') : t('settings.save')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
