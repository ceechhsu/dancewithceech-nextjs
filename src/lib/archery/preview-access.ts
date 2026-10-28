/** Optional deployment-wide isolation for the fictional phone demo. Never an auth bypass. */
export function archeryPreviewPath(pathname:string,demoOnly:boolean):'allow'|'redirect'|'deny'{
 if(!demoOnly)return 'allow'
 if(pathname==='/')return 'redirect'
 if(pathname==='/attendance/archery-preview'||pathname.startsWith('/_next/')||pathname==='/logo-mark.png'||pathname==='/favicon.ico'||/^\/api\/archery-preview\/runtime\/pglite\.(wasm|data)$/.test(pathname))return 'allow'
 return 'deny'
}
