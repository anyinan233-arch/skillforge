import test from 'node:test';
import assert from 'node:assert/strict';
import {publicIP,referenceURL,extractText,validateReferences,generateReferencePackage} from '../references.mjs';
test('reference URLs reject local destinations, credentials, and alternate protocols',()=>{
 for(const url of ['http://example.com','https://127.0.0.1','https://[::1]','https://localhost','https://user:password@example.com','https://example.com:8443'])assert.throws(()=>referenceURL(url));
 for(const ip of ['127.0.0.1','10.1.2.3','172.16.1.1','192.168.0.1','169.254.169.254','100.64.0.1','::1','224.0.0.1'])assert.equal(publicIP(ip),false);
 assert.equal(publicIP('93.184.216.34'),true);assert.equal(referenceURL('https://example.com/#section').href,'https://example.com/');
});
test('extractor removes executable content and bounds evidence',()=>{assert.equal(extractText('<script>secret()</script><style>red</style><h1>Video &amp; audio</h1>'),'Video & audio');assert.equal(extractText('x'.repeat(20000)).length,14000)});
test('reference requests require intent and bounded source lists',async()=>{
 const body={goal:'Build a video discovery site',sources:[{url:'https://example.com',notes:'Navigation'}]};assert.equal(validateReferences(body).length,1);assert.deepEqual(validateReferences({...body,sources:[]}),[]);
 for(const change of [{sources:null},{sources:Array(6).fill(body.sources[0])},{goal:''},{sources:[{url:'https://example.com',notes:''}]}])assert.throws(()=>validateReferences({...body,...change}));
 await assert.rejects(generateReferencePackage({plan:'short',goal:'test'},{}),e=>e.status===400);
});

import {validateDesignTokens} from '../references.mjs';
test('visual tokens reject CSS injection and out-of-range values',()=>{const t={primary:'#5146d8',background:'#f7f8fb',surface:'#ffffff',text:'#252735',font:'Instrument Sans',radius:8,spacing:16};assert.deepEqual(validateDesignTokens(t),t);for(const patch of [{primary:'url(https://example.com)'},{font:'Unknown'},{radius:25},{spacing:0}])assert.throws(()=>validateDesignTokens({...t,...patch}));});

test('approved preview tokens are preserved in both exports',async()=>{
 const tokens={primary:'#5146d8',background:'#f7f8fb',surface:'#ffffff',text:'#252735',font:'Georgia',radius:8,spacing:16};let sent;
 const result=await generateReferencePackage({goal:'Design a Web UI workspace',plan:'Preserve the sidebar and improve hierarchy for designers.',tokens},{key:'test',fetchImpl:async(url,options)=>{sent=JSON.parse(options.body);return {ok:true,json:async()=>({output:[{content:[{type:'output_text',text:JSON.stringify({skill:{name:'Web UI Builder',purpose:'Build an accessible web interface from approved requirements.',instructions:['Review the design requirements.'],inputs:['Design brief'],outputs:['Web UI']},specification:'# Design specification'})}]}]})}}});
 assert.match(JSON.stringify(sent.input),/Georgia/);assert.match(result.specification,/Approved visual tokens/);assert.match(result.specification,/Georgia/);assert.ok(result.skill.instructions.some(s=>s.includes('Georgia')));
 await assert.rejects(generateReferencePackage({goal:'Design a Web UI workspace',plan:'Preserve the sidebar and improve hierarchy for designers.',tokens:{...tokens,radius:100}},{}),e=>e.status===400);
});
