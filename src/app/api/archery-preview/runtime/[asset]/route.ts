import {readFile} from 'node:fs/promises'
import path from 'node:path'
export const runtime='nodejs'
export async function GET(_request:Request,{params}:{params:Promise<{asset:string}>}){
 const {asset}=await params
 if(!['pglite.wasm','pglite.data'].includes(asset))return new Response('Not found',{status:404})
 const content=await readFile(path.join(process.cwd(),'node_modules/@electric-sql/pglite/dist',asset))
 return new Response(content,{headers:{'Content-Type':asset.endsWith('.wasm')?'application/wasm':'application/octet-stream','Cache-Control':'public, max-age=86400'}})
}
