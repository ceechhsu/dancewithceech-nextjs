// Reauthenticate in a separate tab so an unsaved recording stays in memory.
window.showSignIn = () => {
 if(document.getElementById('signInRecovery'))return;
 const box=document.createElement('aside');box.id='signInRecovery';box.setAttribute('role','alert');
 box.style.cssText='position:fixed;left:16px;right:16px;bottom:16px;z-index:10000;padding:20px;background:#18231b;color:#f2f0e7;border:2px solid #bce7b1;border-radius:8px;font:16px/1.5 system-ui';
 const text=document.createElement('p');text.textContent='Your sign-in expired. Keep this tab open to preserve your take and review settings.';
 const link=document.createElement('a');link.textContent='Sign in again ↗';link.href='/practice/login?next='+encodeURIComponent(location.pathname+location.search+location.hash);link.target='_blank';link.rel='noopener';link.style.color='#bce7b1';
 const hint=document.createElement('p');hint.textContent='After signing in, return to this tab and retry the action. Reload only if you have no unsaved take.';
 const dismiss=document.createElement('button');dismiss.textContent='Dismiss';dismiss.onclick=()=>box.remove();
 box.append(text,link,hint,dismiss);document.body.append(box);
};
