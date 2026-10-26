import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSkill} from '../ai.mjs';
const description='Create a bilingual travel packing checklist skill based on weather and trip length.';
const draft={skill:{name:'Packing Planner',purpose:'Plan packing for trips',instructions:['Ask for weather and trip length','Group items by category','Flag missing context'],inputs:['Weather','Trip length'],outputs:['Packing checklist']},summary:'Tailored packing workflow'};
const reply=payload=>async()=>({ok:true,json:async()=>payload});
test('generation passes the custom request, schema and cancellation signal without storing responses',async()=>{
 const signal=new AbortController().signal;let sent;
 const result=await generateSkill({description},{key:'test',signal,fetchImpl:async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/responses');assert.equal(options.signal,signal);sent=JSON.parse(options.body);return {ok:true,json:async()=>({output:[{content:[{type:'output_text',text:JSON.stringify(draft)}]}]})}}});
 assert.deepEqual(result,draft);assert.equal(sent.store,false);assert.equal(JSON.parse(sent.input).description,description);assert.equal(sent.text.format.strict,true);
});
test('invalid descriptions and missing key fail before contacting provider',async()=>{
 const fetchImpl=()=>{throw Error('Unexpected network call')};
 for(const value of [undefined,'short',' '.repeat(20),'a'.repeat(12001)])await assert.rejects(generateSkill({description:value},{key:'test',fetchImpl}),e=>e.status===400);
 await assert.rejects(generateSkill({description},{fetchImpl}),e=>e.status===503);
});
test('provider failure, refusal, incomplete and malformed drafts never become template success',async()=>{
 await assert.rejects(generateSkill({description},{key:'test',fetchImpl:async()=>({ok:false,status:429})}),/quota/);
 for(const payload of [{status:'incomplete'},{output:[{content:[{type:'refusal'}]}]},{output:[{content:[{type:'output_text',text:'not json'}]}]},{output:[{content:[{type:'output_text',text:JSON.stringify({...draft,skill:{...draft.skill,instructions:[]}})}]}]}])await assert.rejects(generateSkill({description},{key:'test',fetchImpl:reply(payload)}));
});
