import test from 'node:test';
import assert from 'node:assert/strict';
import {refineSkill} from '../ai.mjs';
const skill={name:'Notes',purpose:'Summarize meetings',instructions:['Extract decisions'],inputs:['Notes'],outputs:['Decisions']};
test('refinement sends feedback and test context and returns a validated draft',async()=>{
 let sent;const revised={skill:{...skill,instructions:['Extract decisions','Separate proposals from decisions']},summary:'Distinguishes proposals.'};
 const result=await refineSkill({skill,feedback:'Separate proposals',context:'Synthetic test result'},{key:'test',fetchImpl:async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/responses');sent=JSON.parse(options.body);return {ok:true,json:async()=>({output:[{content:[{type:'output_text',text:JSON.stringify(revised)}]}]})}}});
 assert.deepEqual(result,revised);assert.equal(sent.store,false);assert.equal(JSON.parse(sent.input).context,'Synthetic test result');assert.equal(skill.instructions.length,1);
});
test('refinement rejects missing configuration, empty instructions and refusal',async()=>{
 await assert.rejects(refineSkill({skill,feedback:'Improve'}),/Configure/);
 for(const content of [[{type:'output_text',text:JSON.stringify({skill:{...skill,instructions:[]},summary:'Invalid'})}],[{type:'refusal'}]])await assert.rejects(refineSkill({skill,feedback:'Improve'},{key:'test',fetchImpl:async()=>({ok:true,json:async()=>({output:[{content}]})})}));
});
