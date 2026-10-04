import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
export function scopeTrainerText(text) {
  return text.replace(/(["'`])\/(?=(?:api|auth|login|logout|trial-assets|lessons)(?:[/?"'`])|[^/"'`\s]+\.(?:html|m?js|css|png|jpg|svg|mp3)|[?#"'`])/g, '$1/practice/').replace(/next=%2F(?!practice)/g, 'next=%2Fpractice%2F');
}
export function adaptHostedTrainer(name,text) {
 if(name==='debug-upload.mjs') return fs.readFileSync(new URL('./trainer-hosted/debug-upload.mjs',import.meta.url),'utf8');
 const titles={'index.html':'OnBeat · Dance With Ceech','compare.html':'Compare · OnBeat','profile.html':'My profile · OnBeat','challenge.html':'A friend challenged you · OnBeat'};
 if(titles[name]) text=text.replace(/<title>[^<]*<\/title>/,`<title>${titles[name]}</title>`);
 if(name==='index.html') text=text.replace('<h1>Practice library</h1>','<h1>OnBeat</h1>');
 if(name==='trainer.js') text=text.replace(/ fetch\('\/api\/camera-diagnostics',[^\n]+/, " $('cameraReportStatus').textContent='Camera settings are shown on this device only.';");
 if(name==='index.html') text=text.replace(/<details id="cameraDiagnostics">[\s\S]*?<\/details>/, '<details id="cameraDiagnostics" hidden><summary>Camera settings</summary><p id="cameraReportStatus"></p><pre id="cameraDetails"></pre></details>');
 return scopeTrainerText(text);
}
export function importTrainer(source, destination) {
 const target=path.join(destination,'public/practice');fs.mkdirSync(target,{recursive:true});
 const manifest=JSON.parse(fs.readFileSync(path.join(source,'lessons/manifest.json'),'utf8'));
 const copied=[];
 function copy(from,to,transform=false){const b=fs.readFileSync(from);fs.mkdirSync(path.dirname(to),{recursive:true});fs.writeFileSync(to,transform?adaptHostedTrainer(path.basename(from),b.toString()):b);copied.push(path.relative(target,to));}
 // Reviewed application files only. Development trials and legacy teacher review stay local.
 const excluded=new Set(['local-analysis.html','local-analysis.mjs','local-benchmark.json','foot-reference.html','foot-reference.mjs','camera-test.html','camera-test.mjs']);
 for(const item of fs.readdirSync(path.join(source,'static'),{withFileTypes:true})){
  if(item.isDirectory()){if(item.name==='trial-assets')for(const name of fs.readdirSync(path.join(source,'static',item.name)))copy(path.join(source,'static',item.name,name),path.join(target,item.name,name));continue;}
  if(excluded.has(item.name))continue;
  copy(path.join(source,'static',item.name),path.join(target,item.name),/\.(?:html|m?js|css)$/.test(item.name));
 }
 const fields=['id','version','title','description','bpm','bars','audio_duration','reference_duration','reference_width','reference_height','reference_audio_offset','reference_audio_offset_status','reference_audio_offset_note','audio_source','audio_note','timing_note','practice_ready'];
 const lessons=manifest.lessons.filter(x=>['marching','2step'].includes(x.id)).map(x=>{
  const result=Object.fromEntries(fields.filter(k=>k in x).map(k=>[k,x[k]]));
  for(const [key,url] of [['reference','reference_url'],['audio','audio_url'],['poster','poster_url'],['markers','markers_url']])if(x[key]){copy(path.join(source,'lessons',x.id,x[key]),path.join(target,'lessons',x.id,x[key]));result[url]='/practice/lessons/'+x.id+'/'+x[key];}
  result.reference_hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(source,'lessons',x.id,x.reference))).digest('hex');return result;
 });
 const catalog=path.join(destination,'src/content/trainer-lessons.json');fs.mkdirSync(path.dirname(catalog),{recursive:true});fs.writeFileSync(catalog,JSON.stringify({version:1,lessons},null,2)+'\n');
 fs.writeFileSync(path.join(target,'asset-manifest.json'),JSON.stringify({files:copied.sort().map(name=>({name,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(target,name))).digest('hex')}))},null,2)+'\n');
 return lessons;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 if(!process.argv[2])throw Error('Provide the reviewed trainer source directory.');
 importTrainer(path.resolve(process.argv[2]),process.cwd());
 console.log('Imported the two reviewed drills and trainer application.');
}
