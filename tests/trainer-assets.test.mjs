import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import {scopeTrainerText} from '../scripts/import-trainer.mjs';
test('trainer root links and API paths remain inside practice without changing external addresses',()=>{
 assert.equal(scopeTrainerText(`fetch('/api/account');href="/";href="https://dancewithceech.com/";href="/auth/google?next=%2Fprofile.html";import './x.mjs'`),`fetch('/practice/api/account');href="/practice/";href="https://dancewithceech.com/";href="/practice/auth/google?next=%2Fpractice%2Fprofile.html";import './x.mjs'`);
});
test('both approved lesson assets match their catalog fingerprints',()=>{
 const catalog=JSON.parse(fs.readFileSync(new URL('../src/content/trainer-lessons.json',import.meta.url)));
 assert.deepEqual(catalog.lessons.map(x=>x.id),['marching','2step']);
 for(const lesson of catalog.lessons){const content=fs.readFileSync(new URL('../public'+lesson.reference_url,import.meta.url));assert.equal(crypto.createHash('sha256').update(content).digest('hex'),lesson.reference_hash);for(const key of ['audio_url','markers_url'])assert.ok(fs.existsSync(new URL('../public'+lesson[key],import.meta.url)));}
});
test('generated trainer files match the checked-in import manifest',()=>{
 const dir=new URL('../public/practice/',import.meta.url);const manifest=JSON.parse(fs.readFileSync(new URL('asset-manifest.json',dir)));
 for(const item of manifest.files)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(item.name,dir))).digest('hex'),item.sha256,item.name);
 assert.ok(!manifest.files.some(x=>/local-analysis\.html|camera-test\.html|foot-reference\.html/.test(x.name)));
});
test('practice navigation keeps challenge context while moving between screens',async()=>{
 const {LessonNavigation,lessonRoute}=await import('../public/practice/lesson-navigation.mjs');const id='a'.repeat(32);const nav=new LessonNavigation({}, {challenge:id});
 assert.equal(lessonRoute('library'),'/practice/');assert.equal(nav.route('lesson','marching'),'/practice/?challenge='+id+'#lesson=marching');
});

test('concatenated challenge actions are not mistaken for application roots',()=>{assert.equal(scopeTrainerText("request('/api/challenges/'+id+'/accept'); request('/api/challenges/'+id+'/email')"),"request('/practice/api/challenges/'+id+'/accept'); request('/practice/api/challenges/'+id+'/email')");});

test('hosted trainer omits legacy Mac-only diagnostic endpoints',()=>{
 const trainer=fs.readFileSync(new URL('../public/practice/trainer.js',import.meta.url),'utf8');
 const debug=fs.readFileSync(new URL('../public/practice/debug-upload.mjs',import.meta.url),'utf8');
 assert.ok(!trainer.includes('/api/camera-diagnostics'));assert.ok(!debug.includes('/api/debug-recording'));
});
