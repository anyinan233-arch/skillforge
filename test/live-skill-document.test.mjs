import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {validateInput} from '../ai.mjs';
const source=readFileSync(new URL('../dist/references.js',import.meta.url),'utf8');
const documentCode=source.slice(source.indexOf('function ensureSkillDocument(){'),source.lastIndexOf("\nfor(const [key,id] of [['documentBefore'"));
function editor(draft){
 const nodes={projectName:{value:'Reading UI'},skillDocumentBefore:{value:'',style:{},scrollHeight:100},skillDocumentAfter:{value:'',style:{},scrollHeight:100},inlineVisualRules:{textContent:''}};
 const context=vm.createContext({inlineDraft:draft||{purpose:'Build a reading UI',requirements:'Support keyboard navigation.',instructions:'Implement the page.\nTest keyboard access.',inputs:'Book data',outputs:'Working UI'},$:id=>nodes[id],rules:'Typography: Georgia',visualSkillRules:()=>context.rules,window:{currentInlinePackage:()=>({name:'Reading UI',purpose:'Build a reading UI',inputs:['Book data'],outputs:['Working UI']})}});
 vm.runInContext(documentCode,context);context.syncSkillDocument();return {context,nodes};
}
test('document edits survive visual synchronization and persistence',()=>{
 const {context,nodes}=editor();
 context.inlineDraft.documentBefore+='\n\nCustom opening';context.inlineDraft.documentAfter+='\n\n## Extra acceptance checks\nSupport offline reading.';
 const before=context.inlineDraft.documentBefore,after=context.inlineDraft.documentAfter;
 context.rules='Typography: Arial';context.syncSkillDocument();
 assert.equal(nodes.skillDocumentBefore.value,before);assert.equal(nodes.skillDocumentAfter.value,after);
 assert.match(nodes.inlineVisualRules.textContent,/Typography: Arial/);
 const restored=editor(JSON.parse(JSON.stringify(context.inlineDraft)));
 assert.equal(restored.nodes.skillDocumentAfter.value,after);
});
test('download and execution use the complete edited document with current locked rules',()=>{
 const {context}=editor();context.inlineDraft.documentAfter+='\n'+('Custom instruction. '.repeat(500));context.rules='Spacing: 20px';
 const result=context.window.currentInlinePackage();
 assert.equal(result.skillMarkdown,context.fullSkillDocument());
 assert.match(result.skillMarkdown,/Spacing: 20px/);
 assert.equal(result.instructions.slice(1).join(''),result.skillMarkdown);
 assert.ok(result.instructions.every(part=>part.length<=5000));
 assert.match(result.projectSpec,/Custom instruction/);
 assert.doesNotThrow(()=>validateInput({skill:result,input:'Build the interface.'}));
});
test('Copy writes the complete current Skill including the locked visual section',async()=>{
 const {context}=editor();let copied='';
 Object.assign(context,{designPreview:{},copySkillButton:{textContent:'Copy'},copySkillStatus:{textContent:''},copySkillTimer:null,clearTimeout:()=>{},setTimeout:()=>1,navigator:{clipboard:{writeText:async text=>{copied=text}}}});
 vm.runInContext(source.slice(source.lastIndexOf('copySkillButton.onclick=async()=>{')),context);
 await context.copySkillButton.onclick();
 assert.equal(copied,context.fullSkillDocument());assert.match(copied,/Typography: Georgia/);assert.match(copied,/## Outputs/);
 assert.equal(context.copySkillButton.textContent,'Copied!');
 context.navigator.clipboard.writeText=async()=>{throw Error('Clipboard unavailable')};
 await context.copySkillButton.onclick();assert.equal(context.copySkillButton.textContent,'Copy');assert.match(context.copySkillStatus.textContent,/Copy failed/);
});
test('Undo restores editable text, retains current visual rules, and schedules autosave',()=>{
 const {context,nodes}=editor();let saves=0;
 Object.assign(context,{undoSkillButton:{disabled:true},redoSkillButton:{disabled:true},referenceController:null,scheduleProjectSave:()=>{saves++;context.syncSkillDocument()}});
 for(const id of ['skillDocumentBefore','skillDocumentAfter'])Object.assign(nodes[id],{focus:()=>{},setSelectionRange:()=>{}});
 const undoCode=source.slice(source.indexOf('let skillUndoOwner='),source.indexOf('undoSkillButton.onclick=undoSkillText;'));
 vm.runInContext(undoCode,context);context.window.refreshSkillUndo();
 const original=context.inlineDraft.documentAfter;
 context.recordSkillEdit('documentAfter',{target:{value:original+'\nMistake'},inputType:'insertFromPaste'});
 context.inlineDraft.documentAfter=original+'\nMistake';
 assert.equal(context.undoSkillButton.disabled,false);
 context.rules='Typography: Arial';context.undoSkillText();
 assert.equal(context.inlineDraft.documentAfter,original);assert.equal(context.rules,'Typography: Arial');assert.equal(saves,1);assert.equal(context.undoSkillButton.disabled,true);
 context.redoSkillText();assert.equal(context.inlineDraft.documentAfter,original+'\nMistake');assert.equal(context.rules,'Typography: Arial');assert.equal(saves,2);assert.equal(context.redoSkillButton.disabled,true);
 context.undoSkillText();assert.equal(context.redoSkillButton.disabled,false);
 context.recordSkillEdit('documentAfter',{target:{value:'Another edit'},inputType:'insertFromPaste'});
 assert.equal(context.redoSkillButton.disabled,true,'a fresh edit clears redo history');
 context.inlineDraft=JSON.parse(JSON.stringify(context.inlineDraft));context.window.refreshSkillUndo();
 assert.equal(context.undoSkillButton.disabled,true,'a different project must not inherit undo history');
});
