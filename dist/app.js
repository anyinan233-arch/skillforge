const $=id=>document.getElementById(id),clone=x=>JSON.parse(JSON.stringify(x));
const templates=[{name:'Customer Feedback Analyst',purpose:'Analyze customer feedback, identify recurring product issues, and recommend evidence-based priorities.',instructions:['Categorize feedback by product area','Identify recurring themes and quote supporting evidence','Assess sentiment without making unsupported assumptions','Prioritize issues by frequency and user impact','Recommend a concrete next action for each issue'],inputs:['Customer feedback','Product area','Time period'],outputs:['Key issues','Sentiment','Priority','Recommendations']},{name:'UX Research Synthesizer',purpose:'Turn interview notes into clear themes, supported insights, and design opportunities.',instructions:['Read all notes and identify the research context','Group observations into recurring themes','Separate direct evidence from interpretation','Identify unmet needs and design opportunities','Summarize insights and flag gaps in the evidence'],inputs:['Interview notes','Research question'],outputs:['Themes','Supporting quotes','Insights','Design opportunities']},{name:'Data Storyteller',purpose:'Turn a dataset into an executive-ready story with insights and recommendations.',instructions:['Review the data and its limitations','Identify meaningful patterns and outliers','Connect findings to the business question','Explain insights in plain language','Recommend next steps and note uncertainty'],inputs:['Dataset','Business question'],outputs:['Key findings','Business implications','Recommendations','Limitations']}];
let skill=clone(templates[0]),saved=[],before=null,pending=null,undo=null,busy=false;
try{const v=JSON.parse(localStorage.getItem('skillforge-skills')||'[]');if(Array.isArray(v))saved=v.filter(s=>s&&typeof s.name==='string'&&typeof s.purpose==='string'&&['instructions','inputs','outputs'].every(k=>Array.isArray(s[k])&&s[k].every(x=>typeof x==='string')))}catch{toast('Saved skills could not be read. You can still create a new skill.')}
function toast(t){$('toast').textContent=t;$('toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').style.display='none',3500)}
function lines(t){return t.split('\n').map(x=>x.trim()).filter(Boolean)}
function read(){skill.name=$('name').value;skill.purpose=$('purpose').value;skill.inputs=lines($('inputs').value);skill.outputs=lines($('outputs').value);skill.instructions=[...document.querySelectorAll('.step input')].map(e=>e.value.trim()).filter(Boolean);$('heading').textContent=skill.name||'Untitled skill';return skill}
function valid(){read();return skill.name.trim()&&skill.purpose.trim()&&skill.instructions.length&&skill.inputs.length&&skill.outputs.length}
function dirty(){delete skill.skillMarkdown;delete skill.inlineDraft;read();$('status').textContent='Unsaved changes';$('validation').textContent=valid()?'✓ Structured and ready to test':'Complete the name, purpose, steps, inputs and outputs.';$('result').replaceChildren();syncFile()}
function render(){['name','purpose'].forEach(k=>$(k).value=skill[k]);['inputs','outputs'].forEach(k=>$(k).value=skill[k].join('\n'));$('heading').textContent=skill.name;$('steps').replaceChildren();skill.instructions.forEach((s,i)=>{const row=document.createElement('div');row.className='step';const num=document.createElement('span');num.textContent=String(i+1).padStart(2,'0');const input=document.createElement('input');input.value=s;input.setAttribute('aria-label','Instruction '+(i+1));input.addEventListener('input',dirty);const del=document.createElement('button');del.textContent='×';del.setAttribute('aria-label','Remove instruction '+(i+1));del.onclick=()=>{read();skill.instructions.splice(i,1);render();dirty()};row.append(num,input,del);$('steps').append(row)});$('validation').textContent='✓ Structured and ready to test';$('result').replaceChildren();$('count').textContent=saved.length;syncFile()}
function fileText(s){if(s.skillMarkdown)return s.skillMarkdown;const slug=s.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,64)||'custom-skill';return ['---','name: '+slug,'description: '+JSON.stringify(s.purpose),'---','','# '+s.name,'','## Purpose',s.purpose,'','## Inputs',...s.inputs.map(x=>'- '+x),'','## Instructions',...s.instructions.map((x,i)=>(i+1)+'. '+x),'','## Outputs',...s.outputs.map(x=>'- '+x)].join('\n')}
function syncFile(){ $('fileContent').textContent=fileText(skill); renderOverview();window.refreshUsageGuide?.() }
function panel(view){read();syncFile();const selected=view===true?'test':view===false?'edit':view;['edit','file','test'].forEach(k=>{$(k+'Panel').hidden=k!==selected;$(k+'Tab').classList.toggle('selected',k===selected);$(k+'Tab').setAttribute('aria-selected',k===selected)})}
function refinement(open){$('copilot').hidden=!open;document.querySelector('.workgrid').classList.toggle('with-refine',open);$('toggleRefine').setAttribute('aria-expanded',open);if(open)$('refine').focus()}
function selectPage(page){
 $('howToUse').hidden=page!=='studio';if(page!=='studio'&&window.closeUsage)window.closeUsage();
 $('studio').hidden=page!=='create'&&page!=='studio';$('creation').hidden=page!=='create';$('skillWorkspace').hidden=page!=='studio';$('templatesPanel').hidden=page!=='templates';$('libraryPanel').hidden=page!=='library';
 $('location').textContent={create:'Design brief',templates:'Templates',studio:'Skill studio',library:'My skills'}[page];
 for(const [id,target] of [['new','create'],['workspace','templates'],['library','library']]){const active=page===target;$(id).classList.toggle('active',active);if(active)$(id).setAttribute('aria-current','page');else $(id).removeAttribute('aria-current')}
}
function workMode(show){selectPage(show?'studio':'create');refinement(false)}
function studio(){selectPage('studio')}
function reset(s){document.dispatchEvent(new Event('skill-reset'));$('testInput').value='';skill=clone(s);before=pending=undo=null;$('changes').replaceChildren();$('status').textContent='Example · unsaved';render();panel(false);studio();workMode(true);$('refine').value='';document.dispatchEvent(new Event('skill-loaded'))}
['name','purpose','inputs','outputs'].forEach(k=>$(k).addEventListener('input',dirty));$('add').onclick=()=>{read();skill.instructions.push('New instruction');render();dirty()};$('editTab').onclick=()=>panel(false);$('testTab').onclick=()=>{read();panel(true)};$('workspace').onclick=()=>{selectPage('templates');refinement(false)};$('new').onclick=()=>{reset({name:'Untitled skill',purpose:'',instructions:[],inputs:[],outputs:[]});$('description').value='';workMode(false);$('description').focus();dirty()};
let generationController=null;
function cancelGeneration(){generationController?.abort()}
async function generate(description){
 if(typeof description!=='string'||description.trim().length<12||description.length>12000)throw Error('Describe your task in 12–12,000 characters.');
 if(busy)throw Error('Generation is already in progress.');
 const controller=new AbortController();generationController=controller;busy=true;
 $('generate').disabled=true;$('description').disabled=true;$('cancelGenerate').hidden=false;$('progress').hidden=false;$('progress').textContent='AI is designing your skill. This may take a moment…';$('progress').setAttribute('aria-busy','true');
 const timer=setTimeout(()=>controller.abort(),95000);
 try{
  const response=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({description})});
  let data;try{data=await response.json()}catch{throw Error('The AI server is unavailable. Please try again.')}
  if(!response.ok)throw Error(data.error||'Generation failed. Please try again.');
  if(controller.signal.aborted)throw new DOMException('Cancelled','AbortError');
  generationController=null;reset(data.skill);$('testInput').value='';$('status').textContent='AI generated · unsaved';$('reason').textContent=data.summary;$('progress').hidden=true;return clone(skill);
 }catch(error){const message=error.name==='AbortError'?'Generation cancelled or timed out. Your description is kept; you can try again.':error.message;$('progress').textContent=message;throw Error(message)}
 finally{clearTimeout(timer);generationController=null;busy=false;$('generate').disabled=false;$('description').disabled=false;$('cancelGenerate').hidden=true;$('progress').setAttribute('aria-busy','false')}
}
$('cancelGenerate').onclick=cancelGeneration;
['new','workspace','library'].forEach(id=>$(id).addEventListener('click',cancelGeneration));
$('templateCards').addEventListener('click',cancelGeneration);
$('fileTab').onclick=()=>panel('file');$('toggleRefine').onclick=()=>refinement($('copilot').hidden);$('closeRefine').onclick=()=>{refinement(false);$('toggleRefine').focus()};document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('copilot').hidden){refinement(false);$('toggleRefine').focus()}});
$('generate').onclick=()=>generate($('description').value).catch(e=>toast(e.message));
document.querySelectorAll('[data-refine]').forEach(b=>b.onclick=()=>{$('refine').value=b.dataset.refine});
const templateSampleInputs={
  "Brand Copywriter": "Synthetic example brief\nBrand: Paper & Pause, a friendly stationery shop.\nVoice: warm, clear and practical; avoid hype.\nProduct: a reusable notebook with 40 wipe-clean pages, a pen and a cleaning cloth. Price: $24.\nAudience: university students organizing classes and projects.\nChannel: launch email.\nGoal: introduce the notebook and encourage readers to explore the product page.\nWrite three short email options, each with a subject line and a call to action. Do not invent discounts, reviews or environmental claims.",
  "Data Storyteller": "Synthetic sales data\nBusiness question: How did sales change over the first half of the year, and what should the team investigate next?\nMonth,Orders,Revenue_USD\nJanuary,120,4800\nFebruary,150,6000\nMarch,138,5520\nApril,175,7000\nMay,210,8400\nJune,195,7800\nCreate an executive summary with a monthly orders bar chart, a revenue line chart, totals and practical next steps. Traffic, costs and campaign data are unavailable; do not invent reasons for the changes.",
  "Meeting Notes": "Synthetic team meeting notes\nTopic: improving customer onboarding. Date: October 20, 2026.\nParticipants: Maya (support), Leo (design), Priya (engineering).\nMaya: Customers often ask where to find saved projects.\nDecision: add a link to saved projects in the welcome email.\nMaya will draft the revised welcome email by October 23.\nPriya will implement the link by October 27 after the copy is approved.\nLeo proposed a video tutorial; no decision was made.\nThe team agreed to review support questions two weeks after launch, but did not assign an owner.\nOpen question: should the tutorial appear in the app or the help center?\nSummarize decisions, action items and unresolved questions.",
  "Design Reviewer": "Synthetic interface brief\nPage: mobile checkout for a stationery shop.\nUser goal: complete a purchase quickly and understand the total cost.\nLayout: a single column with shipping address, payment details and order summary. Six equally prominent buttons appear above the final payment button.\nFields use placeholders instead of visible labels. Errors appear only after submission, as a generic message at the top. Shipping cost appears only at the final step.\nConstraints: keep the existing checkout provider and complete improvements within one week. No screenshot, color values or usability study is available.\nPrioritize usability and accessibility concerns, recommend practical changes, and identify what needs testing."
};
Object.assign(templateSampleInputs,{"Website Builder":"Synthetic website brief\nProject: Frame, a video discovery site for independent filmmakers.\nAudience: viewers exploring short films on desktop and mobile.\nPages: home with featured videos and category filters; search with results and an empty state; watch page with player placeholder, creator details and related videos.\nReference direction (user description, not an inspected website): borrow the familiar video-card grid and search-first navigation of video platforms. Use original branding and no copied assets.\nVisual direction: warm white background, dark readable text, restrained violet accents and Instrument Sans.\nConstraints: React frontend prototype, synthetic video metadata, no backend or real uploads, keyboard-accessible controls and layouts down to 360px wide.\nFor this test, deliver the page plan, project design specification, implementation steps and acceptance checklist. Do not claim to have built or deployed the website.","Weekly Update":"Synthetic team work notes\nProject: customer onboarding refresh.\nReporting period: October 19-23, 2026.\nAudience: product lead and delivery team.\nGoal: make saved projects easier to find.\nMaya: finished the revised welcome email copy; awaiting product approval.\nPriya: implemented the saved-projects link in staging; mobile QA is still in progress.\nLeo: completed two navigation mockups. The team has not chosen one.\nBlocker: email release is waiting on product approval.\nNext steps: Maya will request approval on October 26. Priya plans to finish mobile QA by October 27.\nDecision needed: choose a navigation mockup. No owner or deadline has been assigned for this decision.\nNo adoption or conversion metrics are available yet.\nWrite a concise weekly update with progress, blockers, decisions needed and next steps."});
$('sample').onclick=()=>{$('testInput').value=templateSampleInputs[skill.name]||(skill.name.includes('Research')?'Synthetic interview notes: Participant A cannot find saved projects. Participant B finds the navigation labels confusing. Research question: how can project discovery improve?':'Synthetic customer feedback: Checkout takes too long. The payment page freezes on my phone. Please make the text easier to read.');};
$('save').onclick=()=>{if(!valid()){toast('Complete every skill section before saving.');return}const record=clone(skill);record.id=record.id||crypto.randomUUID();record.updated=new Date().toISOString();const next=saved.filter(x=>x.id!==record.id).concat(record);try{localStorage.setItem('skillforge-skills',JSON.stringify(next));saved=next;skill=record;$('status').textContent='Saved to this browser';$('count').textContent=saved.length;toast('Skill saved. Find it in My skills.')}catch{toast('Browser storage is unavailable or full. Skill could not be saved.')}};
const deletedSkills=[];
function deleteSavedSkill(record){
 const index=saved.indexOf(record);if(index<0)return;
 const next=saved.filter((_,i)=>i!==index);
 try{localStorage.setItem('skillforge-skills',JSON.stringify(next))}catch{toast('Could not delete this skill. Browser storage is unavailable.');return}
 deletedSkills.push({record,index});saved=next;$('count').textContent=saved.length;if(skill.id===record.id)$('status').textContent='Unsaved changes';$('library').onclick();
}
function undoSkillDeletion(){
 const last=deletedSkills.at(-1);if(!last)return;const next=saved.slice();
 if(last.record.id&&next.some(s=>s.id===last.record.id)){toast('This skill has already been saved again.');deletedSkills.pop();$('library').onclick();return}
 next.splice(Math.min(last.index,next.length),0,last.record);
 try{localStorage.setItem('skillforge-skills',JSON.stringify(next))}catch{toast('Could not restore this skill. Please try again.');return}
 saved=next;deletedSkills.pop();$('count').textContent=saved.length;$('library').onclick();
}
$('library').onclick=()=>{selectPage('library');const list=$('libraryList');list.replaceChildren();if(deletedSkills.length){const notice=document.createElement('div');notice.className='library-undo';notice.setAttribute('role','status');const message=document.createElement('span');message.textContent='Deleted “'+deletedSkills.at(-1).record.name+'”. You can undo during this session.';const undoButton=document.createElement('button');undoButton.textContent='Undo delete';undoButton.onclick=undoSkillDeletion;notice.append(message,undoButton);list.append(notice)}if(!saved.length){const p=document.createElement('p');p.className='resultcard';p.textContent='No saved skills yet. Create a skill, then choose Save skill.';list.append(p)}saved.slice().reverse().forEach(s=>{const card=document.createElement('div');card.className='librarycard';const info=document.createElement('div');const h=document.createElement('h3');h.textContent=s.name;const p=document.createElement('p');p.textContent=s.purpose;const sm=document.createElement('small');sm.className='muted';sm.textContent=(s.projectDraft?'Design project · Skill files not generated':s.instructions.length+' steps · '+s.outputs.length+' outputs'+(s.documentsOutdated?' · Files need regeneration':''))+(s.designPreview&&s.designTokens?' · Visual preview saved':' · No saved visual preview');info.append(h,p,sm);const b=document.createElement('button');b.textContent='Open skill';b.hidden=Boolean(s.projectDraft);b.onclick=()=>{reset(s);$('status').textContent='Saved to this browser'};const actions=document.createElement('div');actions.className='library-actions';const remove=document.createElement('button');remove.className='delete-skill';remove.textContent='Delete';remove.setAttribute('aria-label','Delete '+s.name);remove.onclick=()=>confirmSkillDeletion(s);const view=document.createElement('button');view.textContent=s.designPreview&&s.designTokens?'View preview':'Create preview';view.onclick=()=>{reset(s);window.openSavedPreview?.()};actions.append(view,b,remove);card.append(info,actions);list.append(card)})};
render();workMode(false);

$('downloadFile').onclick=()=>{if(!valid()){toast('Complete every skill section before downloading.');return}syncFile();const blob=new Blob([$('fileContent').textContent],{type:'text/markdown;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='SKILL.md';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000)};

function renderOverview(){
 const root=$('skillOverview');root.replaceChildren();
 for(const [label,value] of [['What it does',skill.purpose],['When to use it', 'When you have '+(skill.inputs.join(' and ')||'source material')+' and need '+(skill.outputs.join(', ')||'a structured result')+'.'],['What you provide',skill.inputs.join(' · ')],['What you get',skill.outputs.join(' · ')]]){
 const box=document.createElement('div'),h=document.createElement('h3'),p=document.createElement('p');h.textContent=label;p.textContent=value||'Add details in the editor';box.append(h,p);root.append(box);
 }
}
const starterTemplates=[
 {name:'Brand Copywriter',purpose:'Write clear, on-brand copy for a specific audience and channel.',instructions:['Confirm the audience, channel and communication goal','Follow the supplied brand voice and factual product details','Draft three distinct copy options','Avoid unsupported promises and claims','Explain the differences and recommend an option'],inputs:['Brand voice','Product facts','Audience and channel'],outputs:['Three copy options','Recommended option','Rationale']},
 templates[2],
 {name:'Meeting Notes',purpose:'Turn meeting notes into decisions, action items and open questions.',instructions:['Identify the meeting topic and participants from the notes','Summarize important discussion points','Separate confirmed decisions from proposals','List action items with owners and deadlines only when provided','Flag unassigned actions and unresolved questions'],inputs:['Meeting transcript or notes'],outputs:['Summary','Decisions','Action items','Open questions']},
 {name:'Design Reviewer',purpose:'Review a described interface against user goals, usability and accessibility principles.',instructions:['Understand the user goal and interface description','Review hierarchy, navigation and interaction feedback','Identify accessibility concerns supported by the description','Prioritize findings by user impact','Recommend practical changes and flag what needs visual or user testing'],inputs:['Interface description','User goal','Constraints'],outputs:['Prioritized findings','Recommended changes','Validation questions']}
];
starterTemplates.push(...[{"name":"Website Builder","purpose":"Turn a website brief and reference materials into a practical design specification and implementation plan.","instructions":["Confirm the audience, user goals, required pages and technical constraints","Analyze supplied reference descriptions or accessible screenshots; distinguish observations from proposed design choices and never claim to inspect unavailable sources","Define page structure, navigation, reusable components and key interactions","Specify typography, colors, spacing, responsive layouts and accessible states","Create a project design specification and phased implementation plan with acceptance criteria","When coding tools are available and implementation is requested, build and verify the prototype; otherwise clearly deliver the plan and state what remains to be built"],"inputs":["Website brief","Reference materials or descriptions (optional)","Technical constraints"],"outputs":["Page and component plan","Project design specification","Implementation steps","Acceptance checklist"]},{"name":"Weekly Update","purpose":"Turn team work notes into a concise weekly update with progress, blockers and next steps.","instructions":["Identify the reporting period, audience and project goal","Group supplied notes into completed work, ongoing work and blockers","Separate verified progress from estimates and flag missing details","List next steps with owners and dates only when explicitly supplied","Highlight decisions or help needed from the audience","Write a concise update without inventing progress, deadlines or metrics"],"inputs":["Team work notes","Reporting period","Audience"],"outputs":["Weekly summary","Completed and ongoing work","Blockers and decisions needed","Next steps"]}]);
const templateDetails=[
 {icon:'<path d="m12 3 9 9-9 9-9-9z"/><path d="m3 3 6 6m3 3h.01"/><circle cx="12" cy="12" r="2"/>',example:'Draft three launch emails for a new notebook.'},
 {icon:'<path d="M4 4v16h16M8 16v-4m5 4V8m5 8V5"/>',example:'Explain monthly sales trends and recommend next steps.'},
 {icon:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2m6 2V2M9 9h6m-6 4h6m-6 4h3"/>',example:'Turn a team meeting transcript into assigned action items.'},
 {icon:'<rect x="3" y="3" width="18" height="14" rx="2"/><path d="M3 7h18m-14 14h10m-5-4v4m-4-9 2 2 4-4"/>',example:'Review a checkout page for usability and accessibility.'}
];
templateDetails.push({icon:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v5m2 4-3 2 3 2m4-4 3 2-3 2"/>',example:'Plan a video website with home, search and watch pages.'},{icon:'<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4m8-4v4M4 10h16m-12 5 2 2 5-4"/>',example:'Turn team work notes into a clear project status update.'});
const templateCategories=['Writing','Data','Notes','Review','Development','Workflow'];
for(const [i,s] of starterTemplates.entries()){

 const b=document.createElement('button');b.className='template-card';const label=document.createElement('strong'),p=document.createElement('span'),link=document.createElement('small');label.textContent=s.name;p.textContent=s.purpose;link.textContent='Use template →';
 const head=document.createElement('div');head.className='template-card-heading';const icon=document.createElement('span');icon.className='template-icon';icon.setAttribute('aria-hidden','true');icon.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+templateDetails[i].icon+'</svg>';const title=document.createElement('div');title.className='template-title';const category=document.createElement('small');category.className='template-category';category.textContent=templateCategories[i];title.append(label,category);head.append(icon,title);
 const example=document.createElement('div');example.className='template-example';const caption=document.createElement('small');caption.textContent='TRY IT FOR';const text=document.createElement('p');text.textContent=templateDetails[i].example;example.append(caption,text);b.append(head,p,example,link);b.onclick=()=>{reset(s);$('status').textContent='Template draft · unsaved';$('reason').textContent='Edit this reusable starting point or test it with your own input.';$('testInput').value=templateSampleInputs[s.name];};$('templateCards').append(b);
}
let refineController=null,refineContext=null;
document.addEventListener('skill-reset',()=>{refineController?.abort();refineContext=null});
function reviewRefinement(previous,next,summary,context){
 const box=$('changes');box.replaceChildren();const note=document.createElement('p');note.textContent=summary;box.append(note);
 for(const key of ['name','purpose','instructions','inputs','outputs']){
  if(JSON.stringify(previous[key])===JSON.stringify(next[key]))continue;
  const details=document.createElement('details');details.className='change';const title=document.createElement('summary');title.textContent='Changed '+key;const old=document.createElement('pre'),updated=document.createElement('pre');old.textContent='BEFORE\n'+(Array.isArray(previous[key])?previous[key].join('\n'):previous[key]);updated.textContent='AFTER\n'+(Array.isArray(next[key])?next[key].join('\n'):next[key]);details.append(title,old,updated);box.append(details);
 }
 const apply=document.createElement('button');apply.className='primary';apply.textContent=context?'Apply & retest':'Apply changes';apply.onclick=()=>{
  if(execution){toast('Wait for the current test to finish before applying changes.');return}
  if(JSON.stringify(read())!==JSON.stringify(previous)){toast('The skill changed. Preview a fresh refinement first.');return}
  invalidateExecution();skill={...clone(previous),...clone(next)};render();dirty();box.replaceChildren();refineContext=null;
  const undoButton=document.createElement('button');undoButton.textContent='Undo refinement';undoButton.onclick=()=>{invalidateExecution();skill=clone(previous);render();dirty();box.replaceChildren();toast('Previous skill restored')};box.append(undoButton);
  if(context){$('testInput').value=context.input;panel('test');$('run').click()}else toast('Changes applied. Save to keep this version.');
 };
 const discard=document.createElement('button');discard.textContent='Discard';discard.onclick=()=>box.replaceChildren();box.append(apply,discard);
}
$('refineBtn').onclick=async()=>{
 if(refineController)return;if(!valid()){toast('Complete your skill before refining.');return}const feedback=$('refine').value.trim();if(!feedback){toast('Describe a change first.');return}
 const previous=clone(read()),context=refineContext&&JSON.stringify(refineContext.skill)===JSON.stringify(previous)?refineContext:null;
 const controller=new AbortController();refineController=controller;$('refineBtn').disabled=true;$('changes').textContent='Preparing AI changes…';
 const timer=setTimeout(()=>controller.abort(),95000);
 try{const r=await fetch('/api/refine',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({skill:previous,feedback,...(context?{context:JSON.stringify({input:context.input,result:context.result}).slice(0,45000)}:{})})});const data=await r.json();if(!r.ok)throw Error(data.error||'Refinement failed.');if(!controller.signal.aborted)reviewRefinement(previous,data.skill,data.summary,context)}catch(e){if(!controller.signal.aborted)$('changes').textContent=e.message;else if(JSON.stringify(read())===JSON.stringify(previous))$('changes').textContent='Refinement cancelled. Try again.'}finally{clearTimeout(timer);refineController=null;$('refineBtn').disabled=false}
};

const deleteDialog=document.createElement('dialog');
deleteDialog.className='delete-dialog';
deleteDialog.setAttribute('aria-labelledby','deleteTitle');
deleteDialog.setAttribute('aria-describedby','deleteDescription');
deleteDialog.innerHTML='<h3 id="deleteTitle">Delete skill?</h3><p id="deleteDescription">Remove <strong id="deleteSkillName"></strong> from My skills? You can undo this before refreshing the page.</p><div class="delete-dialog-actions"><button id="cancelDelete" autofocus>Cancel</button><button id="confirmDelete">Delete skill</button></div>';
document.body.append(deleteDialog);
let skillToDelete=null;
function confirmSkillDeletion(record){
 skillToDelete=record;
 $('deleteSkillName').textContent='“'+record.name+'”';
 deleteDialog.showModal();
 document.body.classList.add('delete-modal-open');
 $('cancelDelete').focus();
}
function closeDeleteDialog(){deleteDialog.close();skillToDelete=null;document.body.classList.remove('delete-modal-open')}
$('cancelDelete').onclick=closeDeleteDialog;
deleteDialog.addEventListener('cancel',e=>{e.preventDefault();closeDeleteDialog()});
$('confirmDelete').onclick=()=>{
 const record=skillToDelete;
 closeDeleteDialog();
 if(record){deleteSavedSkill(record);$('library').focus()}
};
