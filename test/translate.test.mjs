import test from 'node:test';
import assert from 'node:assert/strict';
import {translateSavedSkill} from '../references.mjs';
const skill={name:'会议记录',purpose:'整理记录',instructions:['列出决策'],inputs:['记录'],outputs:['总结']};
const translated={skill:{name:'Meeting notes',purpose:'Organize notes',instructions:['List decisions'],inputs:['Notes'],outputs:['Summary']},projectSpec:'# Scope\nPreserve 3 pages.',referencePlan:'Original plan in English.'};
const mock=result=>({key:'test',fetchImpl:async()=>({ok:true,json:async()=>({output:[{content:[{type:'output_text',text:JSON.stringify(result)}]}]})})});
test('translation preserves structure and returns both documents',async()=>{const result=await translateSavedSkill({skill,projectSpec:'范围：3页',referencePlan:'原方案'},mock(translated));assert.deepEqual(result,translated);assert.equal(skill.name,'会议记录')});
test('translation rejects missing documents, changed steps and remaining Chinese',async()=>{for(const change of [{projectSpec:''},{skill:{...translated.skill,instructions:[]}},{referencePlan:'仍然中文'}])await assert.rejects(translateSavedSkill({skill,projectSpec:'范围：3页',referencePlan:'原方案'},mock({...translated,...change}))) });
