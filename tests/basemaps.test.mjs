import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BASE_MAPS, baseMapAction, fillTiandituKey, needsTiandituKey } from '../lib/basemaps.js'

test('底图目录：id 唯一、两类齐全、kind 合法、非 default url 非空', () => {
  const ids = new Set(BASE_MAPS.map((d) => d.id))
  assert.equal(ids.size, BASE_MAPS.length, 'id 唯一')
  const cats = new Set(BASE_MAPS.map((d) => d.category))
  assert.ok(cats.has('矢量') && cats.has('影像'), '两类都有')
  for (const d of BASE_MAPS) {
    assert.ok(d.kind === 'raster' || d.kind === 'style', `${d.id} kind 合法`)
    assert.ok(d.name && d.category, `${d.id} 有名称/分类`)
    if (d.id !== 'default') assert.ok(d.url, `${d.id} url 非空`)
  }
  assert.ok(BASE_MAPS.some((d) => d.id === 'default'), '有 default 初始底图')
  assert.ok(BASE_MAPS.some((d) => d.kind === 'style'), '有矢量样式底图')
  assert.ok(BASE_MAPS.some((d) => d.kind === 'raster' && d.id !== 'default'), '有影像光栅底图')
})

test('天地图矢量底图：矢量分组、带注记 URL、瓦片模板含 {tk} 占位', () => {
  const tdt = BASE_MAPS.find((d) => d.id === 'tianditu-vec')
  assert.ok(tdt, '目录含 tianditu-vec')
  assert.equal(tdt.category, '矢量')
  assert.equal(tdt.kind, 'raster')
  assert.ok(tdt.url.includes('T=vec_w'), '底图为天地图 vec_w')
  assert.ok(tdt.url.includes('{tk}'), '底图 URL 带 {tk} 占位')
  assert.ok(tdt.labelUrl?.includes('T=cva_w'), '注记为天地图 cva_w')
  assert.ok(tdt.labelUrl.includes('{tk}'), '注记 URL 带 {tk} 占位')
  assert.ok(needsTiandituKey(tdt), '标记为需要密钥')
  const esri = BASE_MAPS.find((d) => d.id === 'esri-imagery')
  const dft = BASE_MAPS.find((d) => d.id === 'default')
  assert.ok(esri && dft)
  assert.ok(!needsTiandituKey(esri), 'esri 不需要密钥')
  assert.ok(!needsTiandituKey(dft), 'default 不需要密钥')
})

test('fillTiandituKey：填充 {tk} 占位，无占位原样', () => {
  assert.equal(fillTiandituKey('https://x/tile?tk={tk}', 'abc123'), 'https://x/tile?tk=abc123')
  assert.equal(fillTiandituKey('https://x/{z}/{x}/{y}.png', 'abc123'), 'https://x/{z}/{x}/{y}.png')
})

test('baseMapAction: 样式→setStyleUrl；光栅+base源→setTiles；光栅无base源→setStyleRaster', () => {
  const style = BASE_MAPS.find((d) => d.kind === 'style')
  const raster = BASE_MAPS.find((d) => d.id === 'esri-imagery')
  assert.ok(style && raster)
  assert.deepEqual(baseMapAction(style, true), { kind: 'setStyleUrl', url: style.url })
  assert.deepEqual(baseMapAction(style, false), { kind: 'setStyleUrl', url: style.url })
  assert.deepEqual(baseMapAction(raster, true), { kind: 'setTiles', url: raster.url })
  assert.deepEqual(baseMapAction(raster, false), { kind: 'setStyleRaster', url: raster.url })
})

test('baseMapAction: 注记层有无匹配才 setTiles，不匹配整样式重建', () => {
  const tdt = BASE_MAPS.find((d) => d.id === 'tianditu-vec')
  const esri = BASE_MAPS.find((d) => d.id === 'esri-imagery')
  assert.ok(tdt && esri)
  // 当前已是天地图样式（base + base-label 都在）→ 只换瓦片
  assert.deepEqual(baseMapAction(tdt, true, true), { kind: 'setTiles', url: tdt.url, labelUrl: tdt.labelUrl })
  // 当前是无注记光栅样式（esri/default）→ 切天地图需重建（补 base-label 源/层）
  assert.deepEqual(baseMapAction(tdt, true, false), { kind: 'setStyleRaster', url: tdt.url, labelUrl: tdt.labelUrl })
  // 当前是天地图样式 → 切 esri 需重建（去掉 base-label 源/层）
  assert.deepEqual(baseMapAction(esri, true, true), { kind: 'setStyleRaster', url: esri.url })
  // 矢量样式样式里只有矢量源 → 切天地图整样式重建
  assert.deepEqual(baseMapAction(tdt, false, false), { kind: 'setStyleRaster', url: tdt.url, labelUrl: tdt.labelUrl })
})
