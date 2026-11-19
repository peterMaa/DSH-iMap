import { test } from 'node:test'
import assert from 'node:assert/strict'
import { maskTiandituKey, tiandituView, TIANDITU_KEY_REF } from '../lib/tianditu-config.js'

test('天地图密钥掩码：仅保留前 4 位与后 4 位', () => {
  assert.equal(maskTiandituKey('abcdef1234567890xyz'), 'abcd****0xyz')
  assert.equal(maskTiandituKey('abcd1234wxyz'), 'abcd****wxyz')
  assert.equal(maskTiandituKey('12345678'), '****')
  assert.equal(maskTiandituKey(''), '')
})

test('设置视图不泄露明文密钥，服务选择按原值返回', () => {
  const view = tiandituView({ key: 'abcd1234wxyz', vector: true, imagery: false })
  assert.deepEqual(view, { keyMask: 'abcd****wxyz', keySet: true, vector: true, imagery: false })
  assert.ok(JSON.stringify(view).includes('abcd****wxyz') === true)
  assert.ok(JSON.stringify(view).includes('1234wxyz') === false)
  assert.equal(TIANDITU_KEY_REF, 'WEBGIS_TIANDITU_KEY')
})
