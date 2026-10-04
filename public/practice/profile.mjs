import {request,el} from './challenges.mjs';
const $=id=>document.getElementById(id);
let saved,pendingPhoto=null,photoMode='google',dirty=false;
function avatar(node,url,name){node.replaceChildren();if(url){const img=el('img');img.src=url;img.alt='';img.referrerPolicy='no-referrer';img.onerror=()=>{node.textContent=(name||'D').slice(0,1).toUpperCase();};node.append(img);}else node.textContent=(name||'D').slice(0,1).toUpperCase();}
function photoPreview(){avatar($('editAvatar'),photoMode==='custom'?(pendingPhoto||saved.photo_url):photoMode==='google'?saved.google_photo_url:'',$('displayName').value);}
function render(data){saved=data;photoMode=data.photo_mode;pendingPhoto=null;dirty=false;$('firstName').value=data.first_name;$('lastName').value=data.last_name;$('displayName').value=data.display_name;$('profileEmail').value=data.email;$('summaryName').textContent=data.display_name;$('pointBalance').textContent=data.points;avatar($('summaryAvatar'),data.photo_url,data.display_name);photoPreview();$('rewardList').replaceChildren();
 for(const reward of data.rewards){const row=el('li'),label=el('span',(reward.lesson==='2step'?'2-Step':'Marching')+' challenge completed');label.append(el('small',new Date(reward.completed*1000).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})));row.append(label,el('strong','+'+reward.points+' points'));$('rewardList').append(row);}
 if(!data.rewards.length)$('rewardList').append(el('li','Your first completed challenge will appear here.'));
}
async function load(){try{render(await request('/practice/api/profile'));$('profileStatus').textContent='';$('profileContent').hidden=false;}catch(error){$('profileStatus').textContent=error.status===401?'Sign in to view and edit your profile.':error.message;if(error.status===401){const a=el('a','Continue with Google','profile-back');a.href='/practice/auth/google?next=%2Fpractice%2Fprofile.html';$('profileStatus').append(document.createElement('br'),a);}}}
$('profileForm').addEventListener('input',()=>{dirty=true;$('saveStatus').textContent='Unsaved changes';});
$('googlePhoto').onclick=()=>{photoMode='google';pendingPhoto=null;dirty=true;photoPreview();$('saveStatus').textContent='Save to use your Google photo.';};
$('removePhoto').onclick=()=>{photoMode='none';pendingPhoto=null;dirty=true;photoPreview();$('saveStatus').textContent='Save to remove your photo.';};
$('photoFile').onchange=async()=>{const file=$('photoFile').files[0];if(!file)return;$('saveProfile').disabled=true;try{
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw Error('Choose a JPG, PNG or WebP up to 10 MB.');
 const bitmap=await createImageBitmap(file);if(bitmap.width*bitmap.height>50000000){bitmap.close();throw Error('Choose a smaller photo.');}
 const canvas=document.createElement('canvas');canvas.width=canvas.height=384;const side=Math.min(bitmap.width,bitmap.height);canvas.getContext('2d').drawImage(bitmap,(bitmap.width-side)/2,(bitmap.height-side)/2,side,side,0,0,384,384);bitmap.close();pendingPhoto=canvas.toDataURL('image/jpeg',.85);photoMode='custom';dirty=true;photoPreview();$('saveStatus').textContent='Photo ready. Save changes to keep it.';
 }catch(error){$('saveStatus').textContent=error.message;}finally{$('saveProfile').disabled=false;$('photoFile').value='';}};
$('profileForm').onsubmit=async event=>{event.preventDefault();$('profileFields').disabled=true;$('saveStatus').textContent='Saving…';try{const data={first_name:$('firstName').value.trim(),last_name:$('lastName').value.trim(),display_name:$('displayName').value.trim(),photo_mode:photoMode};if(pendingPhoto)data.photo_data=pendingPhoto;render(await request('/practice/api/profile',data));$('saveStatus').textContent='Profile saved.';}catch(error){$('saveStatus').textContent=error.message;if(error.status===401){const a=el('a','Sign in again');a.href='/practice/auth/google?next=%2Fpractice%2Fprofile.html';$('saveStatus').append(document.createTextNode(' '),a);}}finally{$('profileFields').disabled=false;}};
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
load();
