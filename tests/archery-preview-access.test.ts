import test from 'node:test'
import assert from 'node:assert/strict'
import {archeryPreviewPath} from '../src/lib/archery/preview-access'
test('fictional preview isolation denies real APIs and leaves ordinary deployments unchanged',()=>{
 for(const path of ['/api/attendance/archery','/api/attendance/classes','/api/running-man/checkout','/api/auth/session','/dashboard','/attendance/instructor']){
  assert.equal(archeryPreviewPath(path,true),'deny')
  assert.equal(archeryPreviewPath(path,false),'allow')
 }
 assert.equal(archeryPreviewPath('/',true),'redirect')
 for(const path of ['/attendance/archery-preview','/api/archery-preview/runtime/pglite.wasm','/api/archery-preview/runtime/pglite.data','/_next/static/file.js','/logo-mark.png'])assert.equal(archeryPreviewPath(path,true),'allow')
 assert.equal(archeryPreviewPath('/api/archery-preview/runtime/secret',true),'deny')
})
