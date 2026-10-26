import {analyzeReferences,generateDesignPreview,generateReferencePackage,translateSavedSkill} from './references.mjs';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {runSkill,refineSkill,generateSkill,validateInput} from './ai.mjs';
const port=Number(process.env.PORT||5173), origin=`http://127.0.0.1:${port}`;
const publicFiles={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/playground.js':'playground.js','/references.js':'references.js','/usage.js':'usage.js','/style.css':'style.css'};
const types={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8'};
let active=false;
const server=http.createServer(async(req,res)=>{
 const json=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
 if(req.headers.host!==`127.0.0.1:${port}`&&req.headers.host!==`localhost:${port}`)return json(403,{error:'Invalid host'});
 const path=new URL(req.url,origin).pathname;
 if(path==='/api/status'&&req.method==='GET')return json(200,{configured:Boolean(process.env.OPENAI_API_KEY),model:process.env.OPENAI_MODEL||'gpt-4.1-mini'});
 if(['/api/run','/api/refine','/api/generate','/api/references/analyze','/api/references/preview','/api/references/generate','/api/translate'].includes(path)&&req.method==='POST'){
  if(req.headers.origin!==origin&&req.headers.origin!==`http://localhost:${port}`)return json(403,{error:'Request must come from this app.'});
  if(!req.headers['content-type']?.startsWith('application/json'))return json(415,{error:'Expected JSON'});
  if(active)return json(429,{error:'A skill is already running. Please wait.'});
  active=true;const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),90000);res.on('close',()=>{if(!res.writableEnded)controller.abort()});
  try{let chunks=[],size=0;for await(const chunk of req){size+=chunk.length;if(size>(path==='/api/translate'?translateSavedSkill:path==='/api/references/analyze'?12000000:100000))throw Object.assign(Error('Input is too large.'),{status:413});chunks.push(chunk);}const raw=Buffer.concat(chunks).toString('utf8');let body;try{body=JSON.parse(raw);if(path==='/api/run')body=validateInput(body)}catch(e){throw Object.assign(e,{status:400})}const result=await (path==='/api/references/preview'?generateDesignPreview:path==='/api/translate'?translateSavedSkill:path==='/api/references/analyze'?analyzeReferences:path==='/api/references/generate'?generateReferencePackage:path==='/api/generate'?generateSkill:path==='/api/refine'?refineSkill:runSkill)(body,{key:process.env.OPENAI_API_KEY,model:process.env.OPENAI_MODEL,signal:controller.signal});json(200,result)}catch(e){json(e.status||502,{error:controller.signal.aborted?'The request timed out or was cancelled. Try again with a smaller input.':e.message})}finally{clearTimeout(timer);active=false;}return;
 }
 if(req.method!=='GET'||!publicFiles[path])return json(404,{error:'Not found'});
 try{const file=publicFiles[path];const data=await readFile(new URL(`./dist/${file}`,import.meta.url));res.writeHead(200,{'Content-Type':types[file.split('.').pop()],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data)}catch{json(500,{error:'Could not load app file.'})}
});
server.listen(port,'127.0.0.1',()=>console.log(`SkillForge: ${origin}\nAI: ${process.env.OPENAI_API_KEY?'configured':'API key required'}`));
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`Port ${port} is in use. Stop the previous preview or set PORT in .env.`:e.message);process.exitCode=1});
