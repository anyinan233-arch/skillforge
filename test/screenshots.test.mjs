import test from 'node:test';
import assert from 'node:assert/strict';
import {validateScreenshot,validateReferences,analyzeReferences,referenceContent} from '../references.mjs';
const image={name:'page.png',dataUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aM8sAAAAASUVORK5CYII='};
test('text-only brief generates a direction without reference materials',async()=>{let sent;const result=await analyzeReferences({goal:'Create a reading app home screen',sources:[]},{key:'test',fetchImpl:async(url,options)=>{sent=JSON.parse(options.body);return {ok:true,json:async()=>({output:[{content:[{type:'output_text',text:JSON.stringify({tokens:{primary:'#5146d8',background:'#ffffff',surface:'#f7f7fa',text:'#222222',font:'Instrument Sans',radius:8,spacing:16},observations:[],visuals:[],plan:'A proposed reading app direction based on the written brief.'})}]}]})}}});assert.deepEqual(result.sources,[]);assert.match(result.analysis,/No reference materials supplied/);assert.equal(sent.input[0].content.length,1);assert.match(sent.instructions,/brief alone/);assert.ok(result.plan);assert.ok(result.tokens);});
test('screenshot validation rejects unsupported, spoofed and oversized uploads',()=>{
 assert.deepEqual(validateScreenshot(image),image);
 for(const dataUrl of ['data:image/svg+xml;base64,PHN2Zz4=',image.dataUrl.replace('png','jpeg'),'data:image/png;base64,'+'A'.repeat(4200001),'https://example.com/image.png'])assert.throws(()=>validateScreenshot({...image,dataUrl}));
 assert.equal(validateReferences({goal:'Build a gallery website',sources:[{url:'',notes:'Use the layout',screenshot:image}]}).length,1);
});
test('vision request binds image pixels to source and returns visual findings without echoing pixels',async()=>{
 let sent;
 const result=await analyzeReferences({goal:'Create a gallery website',sources:[{url:'',notes:'Borrow the layout',screenshot:image}]},{key:'test',fetchImpl:async(url,options)=>{sent=JSON.parse(options.body);return {ok:true,json:async()=>({output:[{content:[{type:'output_text',text:JSON.stringify({tokens:{primary:'#5146d8',background:'#f7f8fb',surface:'#ffffff',text:'#252735',font:'Instrument Sans',radius:8,spacing:16},observations:[],visuals:[{sourceIndex:0,layout:'Single-column',palette:'White',typography:'Unknown',style:'Minimal',limitations:'Static image only'}],plan:'An English gallery design plan.'})}]}]})}}});
 assert.equal(sent.input[0].content[2].type,'input_image');assert.equal(sent.input[0].content[2].image_url,image.dataUrl);assert.equal(sent.store,false);assert.equal(result.tokens.radius,8);assert.match(sent.instructions,/English/);assert.match(result.analysis,/Single-column/);assert.equal(result.sources[0].hasScreenshot,true);assert.ok(!JSON.stringify(result).includes('base64'));
 assert.equal(referenceContent({},[])[0].content.length,1);
});
