import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import sharp from 'sharp';
import {createClient} from '@supabase/supabase-js';
const file=process.argv[2];
if(!file)throw Error('Provide a reviewed private profile export. Default is validation only; --apply imports profiles.');
const bytes=await fs.readFile(file), data=JSON.parse(bytes);
if(data.schema!==1||data.policy!=='profiles-only-fresh-challenges'||!Array.isArray(data.profiles)||Object.keys(data).sort().join(',')!=='policy,profiles,schema')throw Error('Invalid profile-only export.');
const seen=new Set();
for(const row of data.profiles){
 if(Object.keys(row).sort().join(',')!=='account,display_name,first_name,last_name,photo,photo_mode,updated'||!/^google:[a-zA-Z0-9_-]{1,255}$/.test(row.account)||seen.has(row.account))throw Error('Invalid or duplicate profile identity.');
 seen.add(row.account);
 for(const key of ['first_name','last_name','display_name'])if(typeof row[key]!=='string'||[...row[key]].length>(key==='display_name'?40:80)||/[\x00-\x1f]/.test(row[key]))throw Error('Invalid name.');
 if(!row.display_name.trim()||row.display_name.includes('@')||!['custom','google','none'].includes(row.photo_mode)||!Number.isFinite(row.updated))throw Error('Invalid profile.');
 if(row.photo_mode==='custom'){
  if(typeof row.photo!=='string'||row.photo.length>400000)throw Error('Invalid photo.');
  const photo=await sharp(Buffer.from(row.photo,'base64'),{limitInputPixels:1024*1024}).metadata();
  if(photo.format!=='jpeg'||photo.width!==384||photo.height!==384)throw Error('Unexpected profile photo format.');
 }else if(row.photo!==null)throw Error('Unexpected photo.');
}
const digest=crypto.createHash('sha256').update(bytes).digest('hex');
if(process.argv.includes('--apply')){
 if(process.env.TRAINER_PROFILE_IMPORT_SHA256!==digest)throw Error('Set the reviewed export fingerprint before importing.');
 const url=process.env.TRAINER_SUPABASE_URL,key=process.env.TRAINER_SUPABASE_SECRET_KEY;
 if(!url||!key)throw Error('Explicit trainer destination and server key required.');
 const db=createClient(url,key,{auth:{persistSession:false}});
 // Conflict-ignore preserves any profile already edited on the destination.
 const {error}=await db.from('trainer_profiles').upsert(data.profiles,{onConflict:'account',ignoreDuplicates:true});
 if(error)throw Error('Profile import failed; no sensitive database response printed.');
 const {data:stored,error:readError}=await db.from('trainer_profiles').select('account').in('account',[...seen]);
 if(readError||stored.length!==seen.size)throw Error('Profile import count verification failed.');
 console.log(JSON.stringify({verified_profiles:seen.size,challenge_records_imported:0}));
}else console.log(JSON.stringify({validated_profiles:seen.size,sha256:digest,challenge_records_imported:0}));
