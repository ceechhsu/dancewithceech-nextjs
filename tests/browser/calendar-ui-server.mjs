import {createServer} from 'node:http'
import {readFile} from 'node:fs/promises'
const root=process.argv[2]
createServer(async(req,res)=>{try{const file=req.url==='/'?'calendar-ui-fixture.html':req.url.slice(1);if(!/^calendar-ui-fixture\.(html|js|css)$/.test(file)){res.writeHead(404);res.end();return}const body=await readFile(root+'/'+file);res.setHeader('Content-Type',file.endsWith('css')?'text/css':file.endsWith('js')?'text/javascript':'text/html');res.end(body)}catch{res.writeHead(404);res.end()}}).listen(3120,'127.0.0.1',()=>console.log('Fictional calendar UI fixture ready on port 3120'))
