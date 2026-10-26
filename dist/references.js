const referencePanel=document.createElement('section');referencePanel.id='referencePanel';referencePanel.hidden=true;
referencePanel.innerHTML=`<button id="analyzeReferences" hidden>Analyze references</button><button id="cancelReferences" hidden>Cancel</button><p id="referenceStatus" role="status"></p><div id="referenceReview" hidden><h2>2. Confirm your design direction</h2><details class="source-analysis"><summary>Source observations & limitations</summary><div id="referenceEvidence"></div><pre id="referenceAnalysis"></pre></details><label for="referencePlan">DESIGN DIRECTION</label><p class="muted">Review what to preserve, what to change and any assumptions. Edit this direction before previewing the visual system.</p><textarea id="referencePlan" rows="12" maxlength="18000"></textarea><button id="generateReferences" class="primary">Use this plan · Generate Skill & specification</button></div>`;
const materials=document.createElement('section');materials.className='composer-materials';materials.innerHTML='<div id="attachmentSummary" class="attachment-summary" aria-label="Added reference materials" hidden></div><div class="attachment-actions"><button id="toggleLinks" aria-expanded="false" aria-controls="referenceDetails">＋ Add link</button><button id="toggleScreenshots" aria-expanded="false" aria-controls="referenceDetails">↑ Upload screenshot</button></div><div id="referenceDetails" hidden><div class="fieldhead"><label>DESIGN MATERIALS</label></div><div id="referenceRows"></div><button id="addReference">+ Add material</button><p class="muted">Materials are sent to OpenAI only when you submit.</p></div>';document.querySelector('.composefoot').before(materials);
$('creation').append(referencePanel);
let referenceController=null,screenshotReads=0;
function setAttachmentPanel(kind,open){
 materials.classList.toggle('show-'+kind,open);
 $(kind==='links'?'toggleLinks':'toggleScreenshots').setAttribute('aria-expanded',String(open));
 $('referenceDetails').hidden=!materials.classList.contains('show-links')&&!materials.classList.contains('show-images');
 if(open){if(!$('referenceRows').children.length)addReference();const target=$('referenceRows').querySelector(kind==='links'?'input[type=url]':'.choose-screenshot');target?.focus()}
}
$('toggleLinks').onclick=()=>setAttachmentPanel('links',!materials.classList.contains('show-links'));
$('toggleScreenshots').onclick=()=>setAttachmentPanel('images',!materials.classList.contains('show-images'));
function materialUrls(row){return [...row.querySelectorAll('input[type=url]')].map(input=>({input,url:input.value.trim()})).filter(x=>x.url)}
function materialSources(){return [...$('referenceRows').children].flatMap((row,index)=>{
 const urls=materialUrls(row),images=row.screenshots||[],notes='Material '+(index+1)+' · '+row.querySelector('.source-role').value+' — '+row.querySelector('textarea').value.trim();
 return Array.from({length:Math.max(urls.length,images.length)},(_,i)=>({url:urls[i]?.url||'',notes,...(images[i]?{screenshot:images[i]}:{})}));
})}
function renderAttachmentSummary(){
 const root=$('attachmentSummary');root.replaceChildren();
 for(const row of $('referenceRows').children){
  const add=(label,image,remove)=>{const chip=document.createElement('div');chip.className='attachment-chip '+(image?'image-chip':'link-chip');if(image){const img=new Image();img.src=image.dataUrl;img.alt=label;chip.append(img)}const text=document.createElement('span');text.textContent=label;const button=document.createElement('button');button.textContent='×';button.setAttribute('aria-label','Remove '+label);button.disabled=Boolean(referenceController||busy);button.onclick=remove;chip.append(text,button);root.append(chip)};
  for(const {input,url} of materialUrls(row))add(url,null,()=>{input.value='';invalidateReferencePlan()});
  for(const image of row.screenshots||[])add(image.name,image,()=>{row.screenshots=row.screenshots.filter(x=>x!==image);row.renderScreenshots();invalidateReferencePlan()});
 }root.hidden=!root.children.length;
}
function updateAttachmentCounts(){renderAttachmentSummary();const rows=[...$('referenceRows').children],links=rows.reduce((n,r)=>n+materialUrls(r).length,0),images=rows.reduce((n,r)=>n+(r.screenshots||[]).length,0);$('toggleLinks').textContent='+ Add website'+(links?' ('+links+')':'');$('toggleScreenshots').textContent='↑ Upload screenshots'+(images?' ('+images+')':'')}

function addReference(){if($('referenceRows').children.length>=5)return;const row=document.createElement('div');row.className='reference-row';const index=crypto.randomUUID();row.innerHTML=`<label for="url-${index}">WEBSITE LINK <small>optional</small></label><input id="url-${index}" type="url" maxlength="2000" placeholder="https://www.youtube.com/"><label for="note-${index}">WHAT TO KEEP OR BORROW <small>optional</small></label><textarea id="note-${index}" rows="2" maxlength="2000" placeholder="Video discovery categories, navigation, or the watch-page information…"></textarea><label for="shot-${index}">DROP A SCREENSHOT <small>optional</small></label><input id="shot-${index}" class="screenshot-input" hidden type="file" accept="image/png,image/jpeg,image/webp"><button class="choose-screenshot" type="button">＋ Choose screenshot<br><small>or drag a file here</small></button><p class="muted">Add multiple screenshots. PNG, JPEG or WebP · max 3 MB each. Up to 5 website/image pairs across all materials.</p><div class="screenshot-preview" hidden><img alt="Reference screenshot preview"><span></span><button class="remove-screenshot">Remove screenshot</button></div><p class="screenshot-error" role="status"></p><button class="remove-reference">Remove reference</button>`;const roleLabel=document.createElement('label');roleLabel.textContent='MATERIAL ROLE';const role=document.createElement('select');role.className='source-role';role.setAttribute('aria-label','Material role');role.innerHTML='<option value="reference">Reference</option><option value="current">Current design</option>';role.addEventListener('change',invalidateReferencePlan);row.prepend(roleLabel,role);row.querySelector('.remove-reference').onclick=()=>{row.remove();invalidateReferencePlan();$('addReference').disabled=false};const addLink=document.createElement('button');addLink.type='button';addLink.className='add-material-link';addLink.textContent='+ Add website in this material';row.querySelector('input[type=url]').after(addLink);addLink.onclick=()=>{if(row.querySelectorAll('input[type=url]').length>=5)return;const wrap=document.createElement('div');wrap.className='material-link';const input=document.createElement('input');input.type='url';input.maxLength=2000;input.placeholder='https://example.com';input.setAttribute('aria-label','Additional website');const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','Remove website');remove.onclick=()=>{wrap.remove();invalidateReferencePlan()};wrap.append(input,remove);addLink.before(wrap);input.focus()};attachScreenshot(row);row.addEventListener('input',invalidateReferencePlan);$('referenceRows').append(row);$('addReference').disabled=$('referenceRows').children.length>=5}
function invalidateReferencePlan(){updateAttachmentCounts();$('referenceReview').hidden=true;window.invalidateVisualPreview?.();const has=[...$('referenceRows').children].some(r=>r.screenshot||r.querySelector('input[type=url]').value.trim());$('generate').textContent='Generate visual preview'}
$('description').addEventListener('input',invalidateReferencePlan);$('addReference').onclick=()=>{addReference();invalidateReferencePlan()};addReference();
const plainGenerate=$('generate').onclick;
$('generate').onclick=async()=>{
 if(screenshotReads){toast('Wait for the screenshot preview to finish loading.');return}
 referencePanel.hidden=false;$('analyzeReferences').onclick();
};
['new','workspace','library'].forEach(id=>$(id).addEventListener('click',()=>{referenceController?.abort();referencePanel.hidden=true}));
document.addEventListener('skill-reset',()=>{referenceController?.abort();referencePanel.hidden=true;if($('designScope')){$('designScope').value='auto';updateScopeHint()}});
$('cancelReferences').onclick=()=>referenceController?.abort();
async function referenceRequest(path,body){
 if(referenceController)throw Error('A reference request is already in progress.');
 const c=new AbortController();referenceController=c;window.setInlineSkillBusy?.(true);const timer=setTimeout(()=>c.abort(),95000);
 for(const node of document.querySelectorAll('#referencePanel input,#referencePanel textarea,#referencePanel button,#referencePanel select,.composer input,.composer textarea,.composer button,.composer select,.preview-fullscreen-dialog input,.preview-fullscreen-dialog textarea,.preview-fullscreen-dialog button,.preview-fullscreen-dialog select'))node.disabled=true;
 $('cancelReferences').disabled=false;$('cancelReferences').hidden=false;if($('previewFullscreenBack'))$('previewFullscreenBack').disabled=false;
 try{const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:c.signal});let data;try{data=await r.json()}catch{throw Error('The reference service is unavailable. Please retry.')}if(!r.ok)throw Error(data.error||'Request failed.');if(c.signal.aborted)throw Error('Request cancelled.');return data}
 finally{clearTimeout(timer);referenceController=null;window.setInlineSkillBusy?.(false);for(const node of document.querySelectorAll('#referencePanel input,#referencePanel textarea,#referencePanel button,#referencePanel select,.composer input,.composer textarea,.composer button,.composer select,.preview-fullscreen-dialog input,.preview-fullscreen-dialog textarea,.preview-fullscreen-dialog button,.preview-fullscreen-dialog select'))node.disabled=false;$('cancelReferences').hidden=true;$('addReference').disabled=$('referenceRows').children.length>=5;$('visualSpecimen')?.querySelector('[data-disabled-example]')?.setAttribute('disabled','');window.refreshSkillUndo?.();}
}
$('analyzeReferences').onclick=async()=>{
 if(screenshotReads){$('referenceStatus').textContent='Wait for the screenshot preview to finish loading.';return}
 const sources=materialSources();if(sources.length>5){$('referenceStatus').textContent='Use up to 5 website/image pairs across your materials.';return}
 $('referenceReview').hidden=true;$('referenceStatus').textContent=sources.length?'Reading references and proposing a design…':'Creating a design direction from your brief…';
 try{const data=await referenceRequest('/api/references/analyze',{goal:designGoal(),sources});
 window.setVisualTokens?.(data.tokens);$('referenceEvidence').replaceChildren();data.sources.forEach(s=>{const card=document.createElement('p');card.className=s.status==='read'||s.hasScreenshot?'connection-status':'execution-warning';card.textContent=`${s.url||'Screenshot reference'} — ${s.status==='read'?'HTML text read':s.status==='screenshot_only'?'No URL supplied':'Page unavailable: '+s.error}${s.hasScreenshot?' · Screenshot supplied for visual analysis':' · No screenshot supplied'}`;$('referenceEvidence').append(card)});
 $('referenceAnalysis').textContent=data.analysis;$('referencePlan').value=data.plan+'\n\n## Reference evidence and limitations\n'+data.analysis+'\n\n'+data.sources.map(s=>`${s.url||'Screenshot reference'} — ${s.status}${s.error?': '+s.error:''}; User interest: ${s.notes}`).join('\n');$('referenceReview').hidden=false;referencePanel.scrollIntoView({behavior:'smooth',block:'start'});$('referenceStatus').textContent='Building your visual preview…';await generatePagePreview();
 }catch(e){$('referenceStatus').textContent=e.name==='AbortError'?'Request cancelled or timed out. Your inputs are kept.':e.message}
};
$('generateReferences').onclick=async()=>{
 $('referenceStatus').textContent='Generating your Skill and project specification…';
 try{const data=await referenceRequest('/api/references/generate',{goal:designGoal(),plan:$('referencePlan').value,tokens:window.getApprovedVisualTokens?.(),preview:designPreview});$('referenceStatus').textContent='Documents generated. You can revise this plan and generate again.';reset({...data.skill,id:previewSourceId||crypto.randomUUID(),designBrief:$('description').value,designScope:$('designScope').value,designPlatform:$('designPlatform').value,projectSpec:data.specification,referencePlan:$('referencePlan').value,designTokens:window.getApprovedVisualTokens?.(),designPreview:clone(designPreview)});$('status').textContent='AI generated · unsaved';$('reason').textContent='Generated from your reviewed reference design plan. Project specification is included in File preview.';$('testInput').value='';panel('file');$('backToDirection').hidden=false;toast('Skill and project specification are ready. Save skill to keep both.');}
 catch(e){$('referenceStatus').textContent=e.name==='AbortError'?'Request cancelled or timed out. Your plan is kept.':e.message}
};
const specPanel=document.createElement('section');specPanel.id='specPanel';specPanel.hidden=true;specPanel.innerHTML='<div class="filetitle"><strong>PROJECT-SPEC.md</strong><button id="downloadSpec">Download specification</button></div><pre id="specContent"></pre>';$('filePanel').append(specPanel);
function syncSpecification(){specPanel.hidden=!skill.projectSpec;$('specContent').textContent=skill.projectSpec||''}
const originalSyncFile=syncFile;syncFile=function(){originalSyncFile();syncSpecification()};
$('downloadSpec').onclick=()=>{if(!skill.projectSpec)return;const url=URL.createObjectURL(new Blob([skill.projectSpec],{type:'text/markdown;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='PROJECT-SPEC.md';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000)};
syncSpecification();

function attachScreenshot(row){
 const input=row.querySelector('.screenshot-input'),preview=row.querySelector('.screenshot-preview'),error=row.querySelector('.screenshot-error');row.screenshots=[];input.multiple=true;
 row.querySelector('.choose-screenshot').innerHTML='+ Choose screenshots<br><small>or drag multiple files here</small>';
 row.renderScreenshots=()=>{preview.replaceChildren();for(const image of row.screenshots){const card=document.createElement('div');card.className='material-image';const img=new Image();img.src=image.dataUrl;img.alt=image.name;const label=document.createElement('span');label.textContent=image.name;const remove=document.createElement('button');remove.textContent='Remove';remove.onclick=()=>{row.screenshots=row.screenshots.filter(x=>x!==image);row.renderScreenshots();invalidateReferencePlan()};card.append(img,label,remove);preview.append(card)}preview.hidden=!row.screenshots.length};
 row.querySelector('.choose-screenshot').onclick=()=>input.click();
 let loading=false;const loadFiles=async files=>{if(loading)return;loading=true;screenshotReads++;const errors=[];try{for(const file of files){try{
 if(row.screenshots.length>=5)throw Error('Use up to 5 screenshots per material.');
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>3*1024*1024)throw Error('Choose PNG, JPEG or WebP images up to 3 MB each.');
 const total=[...$('referenceRows').children].reduce((sum,r)=>sum+(r.screenshots||[]).reduce((n,i)=>n+i.dataUrl.length,0),0);if(total+file.size*4/3>11200000)throw Error('Keep total screenshot size under 8 MB.');
 const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Could not read image.'));reader.readAsDataURL(file)});
 const img=new Image();img.src=dataUrl;await img.decode();if(img.naturalWidth*img.naturalHeight>20000000)throw Error('Resize image below 20 million pixels.');if(!row.isConnected)return;
 row.screenshots.push({name:file.name.slice(0,200),dataUrl});row.renderScreenshots();invalidateReferencePlan();
 }catch(e){errors.push(file.name+': '+e.message)}}}finally{loading=false;screenshotReads--;input.value='';error.textContent=errors.join(' ')||'Ready for visual analysis.'}};
 input.onchange=()=>loadFiles([...input.files]);row.addEventListener('dragover',e=>{e.preventDefault();if(!referenceController&&!busy)row.classList.add('dragging')});row.addEventListener('dragleave',()=>row.classList.remove('dragging'));row.addEventListener('drop',e=>{e.preventDefault();row.classList.remove('dragging');if(!referenceController&&!busy)loadFiles([...e.dataTransfer.files])});
}

// Explicitly requested one-time translation of existing Chinese library content.
const migrationNotice=document.createElement('div');migrationNotice.className='translation-notice';migrationNotice.hidden=true;migrationNotice.setAttribute('role','status');document.querySelector('main').prepend(migrationNotice);
async function translateLibrary(){
 if(localStorage.getItem('skillforge-english-migration-complete'))return;
 const originals=saved.filter(record=>/[\u3400-\u9fff]/.test(JSON.stringify(record)));
 if(!originals.length){localStorage.setItem('skillforge-english-migration-complete','true');return;}
 migrationNotice.hidden=false;
 try{
  const backupKey='skillforge-before-english-translation';if(!localStorage.getItem(backupKey))localStorage.setItem(backupKey,JSON.stringify(saved));
  for(let i=0;i<originals.length;i++){
   const old=originals[i];migrationNotice.textContent=`Translating saved content to English (${i+1}/${originals.length})… Original backup saved in this browser.`;
   const r=await fetch('/api/translate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({skill:old,projectSpec:old.projectSpec||'',referencePlan:old.referencePlan||''}),signal:AbortSignal.timeout(95000)});const data=await r.json();if(!r.ok)throw Error(data.error||'Translation failed.');
   const current=saved.find(x=>x.id===old.id);if(JSON.stringify(current)!==JSON.stringify(old))throw Error('A saved skill changed during translation. Retry to translate the latest version.');
   const next=saved.map(x=>x.id===old.id?{...x,...data.skill,...(old.projectSpec?{projectSpec:data.projectSpec}:{}),...(old.referencePlan?{referencePlan:data.referencePlan}:{}),updated:new Date().toISOString()}:x);
   localStorage.setItem('skillforge-skills',JSON.stringify(next));saved=next;if(skill.id===old.id){skill=clone(saved.find(x=>x.id===old.id));render()}if(!$('libraryPanel').hidden)$('library').onclick();
  }
  localStorage.setItem('skillforge-english-migration-complete','true');
  migrationNotice.textContent='Saved skills and project documents are now in English. Original backup retained in this browser.';
 }catch(e){migrationNotice.textContent=e.message+' ';const retry=document.createElement('button');retry.textContent='Retry translation';retry.onclick=translateLibrary;migrationNotice.append(retry)}
}
translateLibrary();

function clearReferenceMaterials(){
 setAttachmentPanel('links',false);setAttachmentPanel('images',false);
 $('referenceRows').replaceChildren();addReference();$('referenceReview').hidden=true;referencePanel.hidden=true;$('referenceStatus').textContent='';invalidateReferencePlan();
}
$('new').addEventListener('click',clearReferenceMaterials);

// Web UI direction -> visual system -> handoff.
const flowSteps=document.createElement('div');flowSteps.className='design-steps';flowSteps.textContent='01  Describe your idea   /   02  Preview & refine   /   03  Review & download';document.querySelector('.composer').before(flowSteps);
const platformField=document.createElement('div');platformField.className='platform-field';platformField.innerHTML='<label for="designPlatform">Design platform</label><select id="designPlatform"><option value="web">Web UI</option><option value="ios">iOS App</option><option value="android">Android App</option></select><p id="platformHint" class="muted">Responsive layouts for desktop and mobile browsers.</p>';document.querySelector('.composer').prepend(platformField);
const scopeField=document.createElement('div');scopeField.className='scope-field';scopeField.innerHTML='<label for="designScope">Design scope</label><select id="designScope"><option value="auto">Auto · based on your brief</option><option value="system">Complete UI system</option><option value="refinement">Refine existing components</option></select><p id="scopeHint" class="muted" role="status">AI will choose the scope when you generate. You can override it anytime.</p>';platformField.append(scopeField);$('designScope').onchange=()=>{invalidateReferencePlan();updateScopeHint()};
function updateScopeHint(preview){
 const hint=$('scopeHint');if(!hint)return;
 hint.textContent=$('designScope').value==='auto'?(preview?'AI detected: '+(preview.layout==='components'?'Component refinement':'Complete UI system')+' · You can override this choice.':'AI will choose the scope when you generate. You can override it anytime.'):'Manual selection · Used on your next generation.';
}
$('description').addEventListener('input',()=>updateScopeHint());
function designGoal(){const target={web:'Web UI',ios:'iOS App',android:'Android App'}[$('designPlatform').value];return '[Design scope: '+$('designScope').value+']\n[Target platform: '+target+']\n'+$('description').value;}
$('designPlatform').onchange=()=>{invalidateReferencePlan();const native=$('designPlatform').value!=='web';$('platformHint').textContent=native?'App design preview and implementation guidance. Native behavior must be verified in a simulator.':'Responsive layouts for desktop and mobile browsers.';$('visualSpecimen').classList.toggle('mobile-preview',native);$('previewSize').textContent=native?'Desktop view':'Mobile view';$('previewSize').setAttribute('aria-pressed',String(native));};
document.querySelector('.demo').textContent='UI skill builder';document.querySelector('#creation .eyebrow').textContent='WEB & APP UI · FROM REFERENCES TO IMPLEMENTATION';
$('generate').textContent='Generate visual preview';$('addReference').textContent='+ Add material';
$('toggleLinks').textContent='+ Add website';
const roleHint=document.createElement('p');roleHint.className='muted';roleHint.textContent='Website links and screenshots are optional. Start with your written brief, or add materials for more specific guidance.';materials.prepend(roleHint);
const continueVisual=document.createElement('button');continueVisual.id='continueVisual';continueVisual.className='primary';continueVisual.textContent='Confirm direction & preview';$('generateReferences').before(continueVisual);
const visualPanel=document.createElement('section');visualPanel.id='visualPanel';visualPanel.className='visual-panel';visualPanel.hidden=true;
visualPanel.innerHTML='<div class="eyebrow">02 · PREVIEW & REFINE</div><h2>See your direction take shape.</h2><p class="muted">A simplified visual sketch, not the final design. It illustrates direction only; final layout, detail and interactions will be developed during implementation.</p><div id="tokenControls" class="token-controls"></div><div class="preview-toolbar"><button id="regeneratePreview" type="button">Regenerate page</button><button id="previewSize" type="button" aria-pressed="false">Mobile view</button></div><p id="previewStatus" role="status"></p><div id="visualSpecimen"></div><p id="previewRationale" class="muted"></p><p id="contrastNote" class="muted"></p><label class="visual-approval"><input type="checkbox" id="approveVisual"> I have reviewed the page composition and visual system.</label>';
$('referenceReview').append(visualPanel);visualPanel.append($('generateReferences'));$('generateReferences').textContent='Generate Skill & design specification';
let designTokens=null,designPreview=null;
const previewRefinement=document.createElement('div');previewRefinement.className='preview-refinement';
previewRefinement.innerHTML='<label for="previewFeedback">What would you like to change?</label><textarea id="previewFeedback" rows="2" maxlength="2000" placeholder="Make the cards more compact, or move navigation to the left…"></textarea><div class="preview-toolbar"><button id="refinePreview" type="button">Update preview with AI</button><button id="undoPreview" type="button" hidden>Undo last change</button></div><p id="previewRefineStatus" role="status" class="muted">Describe changes in any language. Apply the result to sync your Skill below.</p>';
$('contrastNote').after(previewRefinement);
let previousPreview=null,pendingPreview=null;
const comparison=document.createElement('section');comparison.className='preview-comparison';comparison.hidden=true;
comparison.innerHTML='<div class="eyebrow">REVIEW CHANGES</div><h3>Compare before you apply.</h3><p class="muted">Soft outlines mark changed regions. An outline around the whole preview indicates shared visual styles changed.</p><div class="preview-toolbar"><button id="compareBefore" aria-pressed="false">Before</button><button id="compareAfter" aria-pressed="true">After</button></div><p id="comparisonSummary" class="muted"></p><ul id="comparisonChanges"></ul><div class="preview-toolbar"><button id="acceptPreview" class="primary">Apply changes</button><button id="keepPreview">Keep original</button></div><p id="comparisonView" role="status">Showing After · proposed changes</p>';
$('visualSpecimen').before(comparison);
function lockComparison(){const locked=Boolean(pendingPreview);for(const node of document.querySelectorAll('#tokenControls input,#tokenControls select,#refinePreview,#undoPreview,#regeneratePreview,#approveVisual'))node.disabled=locked;$('generateReferences').disabled=locked||!designPreview||!$('approveVisual').checked;}
function showComparison(after){if(!pendingPreview)return;const version=after?pendingPreview.after:pendingPreview.before;renderPagePreview(version.preview,version.tokens);$('compareBefore').setAttribute('aria-pressed',String(!after));$('compareAfter').setAttribute('aria-pressed',String(after));highlightPreviewChanges(after);$('comparisonView').textContent=after?'Showing After · proposed changes':'Showing Before · current version';}
function closeComparison(){pendingPreview=null;comparison.hidden=true;lockComparison();}
function highlightPreviewChanges(after){
 const a=pendingPreview.before,b=pendingPreview.after,shown=after?b:a,other=after?a:b,root=$('visualSpecimen');
 const mark=(el,label)=>{if(!el)return;el.classList.add('diff-outline');el.setAttribute('data-change',label);el.title=label;};
 const tokenKeys=Object.keys(a.tokens).filter(k=>String(a.tokens[k]).toLowerCase()!==String(b.tokens[k]).toLowerCase());
 if(tokenKeys.length)mark(root,'Visual changes: '+tokenKeys.join(', '));
 if(a.preview.layout!==b.preview.layout||JSON.stringify(a.preview.navigation)!==JSON.stringify(b.preview.navigation)||a.preview.brand!==b.preview.brand)mark(root.querySelector('.page-navigation'),'Navigation changed');
 if(a.preview.title!==b.preview.title)mark(root.querySelector('.page-content>h2'),'Title changed');
 root.querySelectorAll('.page-section').forEach((el,i)=>{if(JSON.stringify(shown.preview.sections[i])!==JSON.stringify(other.preview.sections[i]))mark(el,other.preview.sections[i]?'Section changed':after?'Section added':'Section removed');});
}
$('compareBefore').onclick=()=>showComparison(false);$('compareAfter').onclick=()=>showComparison(true);
$('acceptPreview').onclick=()=>{if(!pendingPreview)return;previousPreview=pendingPreview.before;designPreview=pendingPreview.after.preview;designTokens=pendingPreview.after.tokens;$('approveVisual').checked=false;closeComparison();buildVisual();renderPagePreview();$('undoPreview').hidden=false;$('previewFeedback').value='';$('previewRefineStatus').textContent='Changes applied. Your Skill and design specification are now in sync below.';};
$('keepPreview').onclick=()=>{if(!pendingPreview)return;$('approveVisual').checked=pendingPreview.wasApproved;closeComparison();renderPagePreview();$('previewRefineStatus').textContent='Original preview kept. Your proposed changes were not applied.';};
$('refinePreview').onclick=async()=>{
 if(referenceController||pendingPreview)return;
 const feedback=$('previewFeedback').value.trim();if(!designPreview||!feedback){$('previewRefineStatus').textContent=designPreview?'Describe a change first.':'Generate a page preview first.';return}
 const before={preview:clone(designPreview),tokens:clone(designTokens)},wasApproved=$('approveVisual').checked;
 $('approveVisual').checked=false;$('generateReferences').disabled=true;$('previewRefineStatus').textContent='Updating your current preview…';
 try{const data=await referenceRequest('/api/references/preview',{goal:designGoal(),plan:$('referencePlan').value,preview:before.preview,tokens:before.tokens,feedback});pendingPreview={before,after:{preview:data.preview,tokens:data.tokens},wasApproved};comparison.hidden=false;$('comparisonSummary').textContent=data.summary;const changes=$('comparisonChanges');changes.replaceChildren();for(const key of Object.keys(before.tokens))if(before.tokens[key]!==data.tokens[key])changes.append(previewElement('li','',key.charAt(0).toUpperCase()+key.slice(1)+': '+before.tokens[key]+' → '+data.tokens[key]));if(before.preview.layout!==data.preview.layout)changes.append(previewElement('li','','Navigation: '+before.preview.layout+' → '+data.preview.layout));if(JSON.stringify(before.preview.navigation)!==JSON.stringify(data.preview.navigation))changes.append(previewElement('li','','Navigation items updated'));if(before.preview.title!==data.preview.title||before.preview.brand!==data.preview.brand)changes.append(previewElement('li','','Page title or brand updated'));if(JSON.stringify(before.preview.sections)!==JSON.stringify(data.preview.sections))changes.append(previewElement('li','','Page sections or their content updated'));if(!changes.children.length)changes.append(previewElement('li','','No layout, content or visual token changes detected.'));showComparison(true);$('previewRefineStatus').textContent='Compare the versions above, then apply changes or keep the original.';comparison.scrollIntoView({behavior:'smooth',block:'start'});}
 catch(e){$('previewRefineStatus').textContent=(e.name==='AbortError'?'Update cancelled.':e.message)+' Your previous preview is unchanged.';if(designPreview===null)return;$('approveVisual').checked=wasApproved;}
 finally{lockComparison();$('approveVisual').disabled=Boolean(pendingPreview)||!designPreview;}
};
$('undoPreview').onclick=()=>{if(!previousPreview||referenceController)return;designPreview=previousPreview.preview;designTokens=previousPreview.tokens;previousPreview=null;buildVisual();renderPagePreview();$('approveVisual').checked=false;$('generateReferences').disabled=true;$('undoPreview').hidden=true;$('previewRefineStatus').textContent='Previous preview restored. The synced Skill rules have been updated.';};
window.invalidateVisualPreview=()=>{if(typeof inlineSkillPanel!=='undefined')inlineSkillPanel.hidden=true;closeComparison();designPreview=null;previousPreview=null;$('undoPreview').hidden=true;$('previewFeedback').value='';$('previewRefineStatus').textContent='Describe changes in any language. Apply the result to sync your Skill below.';visualPanel.hidden=true;if(typeof inlineSkillPanel!=='undefined')inlineSkillPanel.hidden=true;$('approveVisual').checked=false;$('generateReferences').disabled=true};
window.setVisualTokens=t=>{designTokens=clone(t);window.invalidateVisualPreview()};
window.getApprovedVisualTokens=()=>{if(pendingPreview||!designTokens||!designPreview||!$('approveVisual').checked)throw Error('Review and approve the visual system first.');return clone(designTokens)};
function contrast(a,b){const luminance=h=>{const c=h.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722};const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
function paintVisual(t=designTokens){const el=$('visualSpecimen');for(const k of ['primary','background','surface','text'])el.style.setProperty('--v-'+k,t[k]);el.style.setProperty('--v-font',t.font);el.style.setProperty('--v-radius',t.radius+'px');el.style.setProperty('--v-space',t.spacing+'px');const ratio=contrast(t.text,t.background),button=contrast('#ffffff',t.primary);$('contrastNote').textContent='Text / background: '+ratio.toFixed(2)+':1 · White button text / primary: '+button.toFixed(2)+':1. '+(Math.min(ratio,button)<4.5?'Consider darker text or a stronger primary color for normal-size text.':'Both pairs meet the 4.5:1 normal-text contrast threshold. This is not a full accessibility audit.');}
function buildVisual(){const root=$('tokenControls');root.replaceChildren();for(const [key,label] of [['primary','Primary'],['background','Background'],['surface','Surface'],['text','Text'],['font','Typeface'],['radius','Corner radius'],['spacing','Spacing']]){const wrap=document.createElement('label');wrap.textContent=label;let input;if(key==='font'){input=document.createElement('select');for(const name of ['Instrument Sans','Arial','Georgia']){const o=document.createElement('option');o.value=o.textContent=name;input.append(o)}}else{input=document.createElement('input');input.type=['radius','spacing'].includes(key)?'range':'color';if(input.type==='range'){input.min=key==='radius'?0:8;input.max=key==='radius'?24:32;input.step=1}}input.setAttribute('aria-label',label);input.value=designTokens[key];const value=document.createElement('small');value.textContent=String(designTokens[key]);input.oninput=()=>{designTokens[key]=input.type==='range'?Number(input.value):input.value;value.textContent=String(designTokens[key]);$('approveVisual').checked=false;$('generateReferences').disabled=true;paintVisual()};wrap.append(input,value);root.append(wrap)}paintVisual()}
async function generatePagePreview(){
 previousPreview=null;$('undoPreview').hidden=true;
 if(!designTokens||$('referencePlan').value.trim().length<30){toast('Analyze your materials and review the direction first.');return}
 visualPanel.hidden=false;designPreview=null;$('approveVisual').checked=false;$('generateReferences').disabled=true;buildVisual();$('visualSpecimen').replaceChildren();$('previewRationale').textContent='';$('previewStatus').textContent='Composing a page from your design direction…';visualPanel.scrollIntoView({behavior:'smooth',block:'start'});
 try{const data=await referenceRequest('/api/references/preview',{goal:designGoal(),plan:$('referencePlan').value,tokens:designTokens});designPreview=data.preview;renderPagePreview();$('referenceStatus').textContent='Preview ready. Adjust the visual settings or describe changes to AI on the right.';$('previewStatus').textContent='Page ready. Adjust the visual system or regenerate to explore another composition.';if(!inlineDraft)await prepareInlineSkill();}
 catch(e){$('previewStatus').textContent=e.name==='AbortError'?'Preview cancelled. Your direction is kept.':e.message+' Try Regenerate page.';}
 finally{$('approveVisual').disabled=!designPreview;$('generateReferences').disabled=true;if(designPreview)scheduleProjectSave();}
}
continueVisual.onclick=()=>{if(designPreview){visualPanel.hidden=false;visualPanel.scrollIntoView({behavior:'smooth'});return}return generatePagePreview()};
$('regeneratePreview').onclick=generatePagePreview;
$('previewSize').onclick=()=>{const mobile=$('visualSpecimen').classList.toggle('mobile-preview');$('previewSize').textContent=mobile?'Desktop view':'Mobile view';$('previewSize').setAttribute('aria-pressed',String(mobile))};
function previewElement(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text)el.textContent=text;return el}
function renderPagePreview(p=designPreview,t=designTokens){
 updateScopeHint(p);
 if($('projectName')&&!$('projectName').value)$('projectName').value=p.title||p.brand||'Untitled project';
 const root=$('visualSpecimen');root.replaceChildren();root.classList.remove('diff-outline');root.removeAttribute('data-change');root.removeAttribute('title');root.dataset.layout=p.layout;
 const nav=previewElement('div','page-navigation');nav.append(previewElement('strong','page-brand',p.brand));const feedback=previewElement('p','page-feedback');feedback.setAttribute('role','status');
 for(const title of p.navigation){const b=previewElement('button','',title);b.onclick=()=>{for(const n of nav.querySelectorAll('button'))n.removeAttribute('aria-current');b.setAttribute('aria-current','page');feedback.textContent=title+' selected — preview only.'};nav.append(b)}if(p.layout!=='components')root.append(nav);
 const content=previewElement('div','page-content');content.append(previewElement('h2','',p.title));
 for(const section of p.sections){const block=previewElement('section','page-section page-'+section.type);block.append(previewElement('h3','',section.title),previewElement('p','',section.body));const grid=previewElement('div','page-grid');grid.style.setProperty('--columns',section.columns);
 for(const item of section.items){const card=previewElement('div','page-item');if(item.visual!=='none'){const media=previewElement('div','page-media media-'+item.visual);media.setAttribute('aria-label','Illustrative '+item.visual+' placeholder');if(item.visual==='chart'){[35,62,48,80,66,94].forEach(height=>{const bar=previewElement('span');bar.style.height=height+'%';media.append(bar)})}else media.textContent=item.visual==='video'?'▶':'◧';card.append(media)}
 if(section.type==='buttons'){card.append(previewElement('button',/secondary|outline/i.test(section.title+' '+item.meta)?'specimen-secondary':'specimen-primary',item.title),previewElement('p','',item.body))}else if(section.type==='typography'){card.append(previewElement(/body|caption/i.test(item.title)?'p':/level 1|h1/i.test(item.title)?'h2':'h3','',item.title),previewElement('p','',item.body),previewElement('small','',item.meta))}else if(section.type==='form'){const label=previewElement('label','',item.title),input=previewElement('input');input.placeholder=item.body;label.append(input);card.append(label)}else{card.append(previewElement('strong','',item.title));if(item.meta)card.append(previewElement('span','page-meta',item.meta));card.append(previewElement('p','',item.body))}grid.append(card)}block.append(grid);
 if(section.action){const b=previewElement('button','specimen-primary',section.action);b.onclick=()=>feedback.textContent=section.action+' — preview only. No data is submitted.';block.append(b)}content.append(block)}content.append(feedback);root.append(content);$('previewRationale').textContent=p.rationale;paintVisual(t);
}

$('approveVisual').onchange=()=>{$('generateReferences').disabled=!designPreview||!$('approveVisual').checked};
const generateDesignPackage=$('generateReferences').onclick;
$('generateReferences').onclick=()=>{if(!$('approveVisual').checked){toast('Review and approve the visual system first.');return}return generateDesignPackage()};
$('new').addEventListener('click',()=>{designTokens=null;window.invalidateVisualPreview()});

const backToDirection=document.createElement('button');backToDirection.id='backToDirection';backToDirection.textContent='Edit preview & instructions';backToDirection.hidden=true;document.querySelector('#skillWorkspace .editorhead>div:last-child').prepend(backToDirection);backToDirection.onclick=()=>{selectPage('create');referencePanel.hidden=false;$('referenceReview').hidden=false;visualPanel.hidden=false;visualPanel.scrollIntoView({behavior:'smooth',block:'start'})};document.addEventListener('skill-reset',()=>backToDirection.hidden=true);

// Keep the rendered result visually separate from its editing controls.
const previewStage=document.createElement('section');previewStage.className='preview-stage';previewStage.setAttribute('aria-labelledby','previewStageTitle');
previewStage.innerHTML='<div class="preview-stage-head"><div><div class="eyebrow">DESIGN OUTPUT</div><h3 id="previewStageTitle">Visual preview</h3></div><span class="preview-badge">Preview only</span></div><p class="muted">Simplified visual sketch only — not the final design. Use it to review direction and component changes.</p>';
previewStage.querySelector('.preview-stage-head').append($('previewSize'));
previewStage.append($('visualSpecimen'));
const previewNotes=document.createElement('details');previewNotes.className='preview-notes';previewNotes.innerHTML='<summary>Design notes & contrast</summary>';previewNotes.append($('previewRationale'),$('contrastNote'));previewStage.append(previewNotes);
const editingStage=document.createElement('section');editingStage.className='preview-editing';editingStage.setAttribute('aria-labelledby','previewEditingTitle');
editingStage.innerHTML='<div class="eyebrow">EDIT YOUR DESIGN</div><h3 id="previewEditingTitle">Adjust & refine</h3><p class="muted">Change the visual settings or describe an update to AI.</p>';
editingStage.append($('tokenControls'),previewRefinement,$('regeneratePreview'),$('approveVisual').closest('label'),$('generateReferences'));
visualPanel.querySelector('.preview-toolbar')?.remove();
const previewWorkspace=document.createElement('div');previewWorkspace.className='preview-workspace';previewWorkspace.append(previewStage);
const refineHeading=document.createElement('div');refineHeading.className='refine-heading';refineHeading.append(editingStage.querySelector('.eyebrow'),editingStage.querySelector('h3'),editingStage.querySelector('p'),editingStage.querySelector('#regeneratePreview'));editingStage.prepend(refineHeading);
visualPanel.append(editingStage,comparison,previewWorkspace);

for(const node of [...$('referenceReview').children])if(node!==visualPanel)node.hidden=true;
continueVisual.hidden=true;

let previewSourceId=null;
let previewReturn='brief';
const projectSave=document.createElement('div');projectSave.className='project-save';projectSave.innerHTML='<label for="projectName">Project name</label><input id="projectName" maxlength="120" placeholder="Name your project"><p id="projectSaveStatus" class="muted" role="status">Autosave starts when your preview is ready · Saved in this browser.</p>';const projectBasics=document.createElement('div');projectBasics.className='project-basics';platformField.before(projectBasics);projectBasics.append(platformField,projectSave);$('projectName').addEventListener('input',()=>scheduleProjectSave());
const previewBack=document.createElement('button');previewBack.id='previewBack';previewBack.textContent='← Back';previewBack.className='preview-back';$('creation').prepend(previewBack);
previewBack.onclick=()=>{referenceController?.abort();if(previewReturn==='library'){$('library').click()}else{document.querySelector('.composer').scrollIntoView({behavior:'smooth',block:'start'});$('description').focus({preventScroll:true})}};
function saveProject(automatic=false){
 if(referenceController||!designPreview||!designTokens){if(!automatic)toast('Generate a visual preview before saving.');return}
 if(pendingPreview&&!automatic){toast('Apply the proposed changes or keep the original before saving.');return}
 const name=$('projectName').value.trim();if(!name){$('projectSaveStatus').textContent='Not saved · Enter a project name to resume autosave.';if(!automatic){$('projectName').focus();toast('Give your project a name.');}return}
 const existing=previewSourceId?saved.find(s=>s.id===previewSourceId):null;
 const base=previewSourceId&&skill.id===previewSourceId?skill:existing;
 const changed=base&&(JSON.stringify(base.designPreview)!==JSON.stringify(designPreview)||JSON.stringify(base.designTokens)!==JSON.stringify(designTokens)||base.referencePlan!==$('referencePlan').value);
 const record={...(base?clone(base):{purpose:$('description').value,instructions:[],inputs:[],outputs:[],projectDraft:true}),id:previewSourceId||crypto.randomUUID(),name,designBrief:$('description').value,designScope:$('designScope').value,designPlatform:$('designPlatform').value,referencePlan:$('referencePlan').value,designTokens:clone(designTokens),designPreview:clone(designPreview),previewApproved:pendingPreview?pendingPreview.wasApproved:$('approveVisual').checked,previewFeedback:$('previewFeedback').value,previewMobile:$('visualSpecimen').classList.contains('mobile-preview'),updated:new Date().toISOString(),...(changed&&!base.projectDraft?{documentsOutdated:true}:{})};
 if(window.currentInlinePackage&&inlineDraft){Object.assign(record,window.currentInlinePackage(),{inlineDraft:clone(inlineDraft),projectDraft:false,documentsOutdated:false})}
 const next=saved.some(s=>s.id===record.id)?saved.map(s=>s.id===record.id?record:s):saved.concat(record);
 try{localStorage.setItem('skillforge-skills',JSON.stringify(next));saved=next;previewSourceId=record.id;skill=clone(record);render();$('count').textContent=saved.length;projectSaveDirty=false;$('projectSaveStatus').textContent='✓ Autosaved · In this browser';if(!automatic)toast('Project saved. Reopen it from My skills to continue editing.');}catch{$('projectSaveStatus').textContent='Could not save: browser storage is unavailable or full. Your current preview is still here.';}
};
function loadSavedDesign(){
 previewSourceId=skill.id||null;
 backToDirection.hidden=false;backToDirection.textContent=skill.designPreview&&skill.designTokens?'View visual preview':'Create visual preview';
}
document.addEventListener('skill-loaded',loadSavedDesign);
window.openSavedPreview=async()=>{
 previewSourceId=skill.id||null;
 inlineDraft=skill.inlineDraft?clone(skill.inlineDraft):null;inlineGeneratedSkill=null;inlineSkillPanel.hidden=true;$('inlineGenerationStatus').textContent='';$('retryInlineSkill').hidden=true;
 previewReturn='library';$('projectName').value=skill.name;$('projectSaveStatus').textContent='✓ Autosaved · In this browser';
 referenceController?.abort();closeComparison();previousPreview=null;$('undoPreview').hidden=true;$('previewFeedback').value='';
 const platform=skill.designPlatform||(/iOS App/.test(skill.projectSpec||'')?'ios':/Android App/.test(skill.projectSpec||'')?'android':'web');
 $('designPlatform').value=platform;$('designScope').value=skill.designScope||'auto';updateScopeHint(skill.designPreview);
 $('description').value=skill.designBrief||skill.purpose;
 $('referenceRows').replaceChildren();addReference();updateAttachmentCounts();setAttachmentPanel('links',false);setAttachmentPanel('images',false);
 $('referencePlan').value=skill.referencePlan||('Project: '+skill.name+'\nPurpose: '+skill.purpose+'\nInstructions:\n'+skill.instructions.join('\n')+'\nOutputs:\n'+skill.outputs.join('\n')).slice(0,18000);
 $('referenceAnalysis').textContent='Reopened from this saved skill. Original reference uploads are not stored.';$('referenceEvidence').replaceChildren();
 $('visualSpecimen').classList.toggle('mobile-preview',platform!=='web');$('previewSize').textContent=platform!=='web'?'Desktop view':'Mobile view';$('previewSize').setAttribute('aria-pressed',String(platform!=='web'));
 selectPage('create');referencePanel.hidden=false;$('referenceReview').hidden=false;visualPanel.hidden=false;
 if(typeof skill.previewMobile==='boolean'){$('visualSpecimen').classList.toggle('mobile-preview',skill.previewMobile);$('previewSize').textContent=skill.previewMobile?'Desktop view':'Mobile view';$('previewSize').setAttribute('aria-pressed',String(skill.previewMobile));}
 $('previewFeedback').value=skill.previewFeedback||'';
 if(skill.designPreview&&skill.designTokens){designPreview=clone(skill.designPreview);designTokens=clone(skill.designTokens);buildVisual();renderPagePreview();$('approveVisual').checked=skill.previewApproved!==false;lockComparison();$('referenceStatus').textContent='Saved project restored. Preview adjustments are saved automatically in this browser.';$('previewStatus').textContent='Showing the visual preview saved with this skill.';window.syncInlineSkill?.();visualPanel.scrollIntoView({behavior:'smooth',block:'start'});}
 else{designPreview=null;$('approveVisual').checked=false;$('generateReferences').disabled=true;$('referenceStatus').textContent='This skill has no saved visual preview. Creating a new interpretation from its instructions…';try{const data=await referenceRequest('/api/references/analyze',{goal:designGoal()+'\n\nExisting skill instructions:\n'+skill.instructions.join('\n').slice(0,3500),sources:[]});designTokens=data.tokens;$('referencePlan').value=(data.plan+'\n\n## Existing skill requirements\n'+$('referencePlan').value).slice(0,18000);await generatePagePreview();}catch(e){$('referenceStatus').textContent=e.message;}}
};
backToDirection.onclick=()=>window.openSavedPreview();
$('new').addEventListener('click',()=>{previewSourceId=null;previewReturn='brief';$('projectName').value='';$('projectSaveStatus').textContent='';backToDirection.hidden=true;});


// Save only committed preview state; proposed AI changes remain pending until accepted.
let projectSaveTimer=null,projectSaveDirty=false;
function scheduleProjectSave(){
 window.syncInlineSkill?.();
 if(!designPreview||!designTokens)return;
 projectSaveDirty=true;clearTimeout(projectSaveTimer);
 $('projectSaveStatus').textContent='Saving… · In this browser';
 projectSaveTimer=setTimeout(()=>saveProject(true),600);
}
function flushProjectSave(){clearTimeout(projectSaveTimer);if(projectSaveDirty)saveProject(true)}
editingStage.addEventListener('input',event=>{if(!previewRefinement.contains(event.target))scheduleProjectSave()});previewRefinement.addEventListener('input',scheduleProjectSave);
$('approveVisual').addEventListener('change',scheduleProjectSave);
for(const id of ['acceptPreview','keepPreview','undoPreview','previewSize'])$(id).addEventListener('click',scheduleProjectSave);
// Flush edits before navigation or an AI request can replace the current state.
for(const id of ['new','workspace','library','previewBack','regeneratePreview','refinePreview','generateReferences']){
 $(id)?.addEventListener('click',flushProjectSave,true);
}
window.addEventListener('pagehide',flushProjectSave);
document.addEventListener('visibilitychange',()=>{if(document.hidden)flushProjectSave()});
document.addEventListener('skill-reset',()=>{clearTimeout(projectSaveTimer);projectSaveDirty=false});
$('new').addEventListener('click',()=>{clearTimeout(projectSaveTimer);projectSaveDirty=false;inlineDraft=null;inlineSkillPanel.hidden=true});

// The live handoff has one editable source and one authoritative visual source.
let inlineDraft=null,inlineGeneratedSkill=null;
const inlineSkillPanel=document.createElement('section');
inlineSkillPanel.className='inline-skill-panel';inlineSkillPanel.hidden=true;
inlineSkillPanel.innerHTML=`<div class="inline-skill-head"><div><div class="eyebrow">YOUR LIVE SKILL</div><h3>SKILL.md</h3><p class="muted">Edit your Skill directly. Gray text is controlled by Preview & refine and stays in sync.</p></div><span id="inlineSaveStatus" class="muted" role="status"></span></div>
<div class="inline-skill-locked"><h4>Synced from preview <span class="preview-badge">Read only</span></h4><p class="muted">Change these rules in Adjust & refine. AI proposals sync only after you apply them.</p><p id="inlineSyncStatus" role="status"></p><pre id="inlineVisualRules" aria-label="Visual rules synced from preview"></pre></div>
<div class="inline-skill-editable"><h4>Editable requirements</h4><p class="muted">These edits are saved automatically and kept when you refine the preview. The synced visual rules take precedence over conflicting requirements.</p><label for="inlinePurpose">Purpose & trigger</label><textarea id="inlinePurpose" rows="3"></textarea><label for="inlineRequirements">Project requirements & reference notes</label><textarea id="inlineRequirements" rows="8"></textarea><label for="inlineInstructions">Implementation instructions <small>one per line</small></label><textarea id="inlineInstructions" rows="7"></textarea><div class="io"><div><label for="inlineInputs">Inputs <small>one per line</small></label><textarea id="inlineInputs" rows="4"></textarea></div><div><label for="inlineOutputs">Outputs <small>one per line</small></label><textarea id="inlineOutputs" rows="4"></textarea></div></div></div>
<p id="inlineGenerationStatus" role="status" class="muted"></p><button id="retryInlineSkill" hidden>Retry Skill generation</button><details class="inline-file"><summary>Full SKILL.md</summary><pre id="inlineFullFile"></pre></details><div class="preview-toolbar"><button id="downloadInlineSkill" class="primary">Download Skill</button><button id="downloadInlineSpec">Download design specification</button></div><p class="muted" id="inlineDownloadStatus">Downloads include the current preview rules and your edited requirements.</p>`;
// Present a single document, with a protected visual section between editable text.
const skillDocument=document.createElement('div');skillDocument.className='skill-document';skillDocument.tabIndex=0;skillDocument.setAttribute('role','region');skillDocument.setAttribute('aria-label','Scrollable Skill editor');
skillDocument.innerHTML='<textarea id="skillDocumentBefore" aria-label="Skill document opening" maxlength="60000" spellcheck="false"></textarea><div class="skill-document-synced" aria-label="Read-only visual rules"></div><textarea id="skillDocumentAfter" aria-label="Skill document body" maxlength="60000" spellcheck="false"></textarea>';
skillDocument.querySelector('.skill-document-synced').append(inlineSkillPanel.querySelector('#inlineVisualRules'));
inlineSkillPanel.querySelector('.inline-skill-head').after(skillDocument);
inlineSkillPanel.querySelector('.inline-skill-locked').hidden=true;
inlineSkillPanel.querySelector('.inline-skill-editable').hidden=true;
inlineSkillPanel.querySelector('.inline-file').hidden=true;
inlineSkillPanel.querySelector('.inline-skill-head').append(inlineSkillPanel.querySelector('#inlineSyncStatus'));
previewWorkspace.append(inlineSkillPanel);
$('generateReferences').hidden=true;
$('approveVisual').closest('label').hidden=true;
const inlineFields={purpose:'inlinePurpose',requirements:'inlineRequirements',instructions:'inlineInstructions',inputs:'inlineInputs',outputs:'inlineOutputs'};
function visualSkillRules(){
 if(!designPreview||!designTokens)return '';
 const platform=$('designPlatform').selectedOptions[0].textContent;
 return ['Target platform: '+platform,'Use these visual rules as the source of truth when older requirements conflict.','Colors: Primary '+designTokens.primary+'; Background '+designTokens.background+'; Surface '+designTokens.surface+'; Text '+designTokens.text,'Typography: '+designTokens.font+'\nCorner radius: '+designTokens.radius+'px\nSpacing: '+designTokens.spacing+'px',(designPreview.layout==='components'?'Component specimens: ':'Page: ')+designPreview.title+'\nBrand: '+designPreview.brand+'\nNavigation placement: '+designPreview.layout+'\nNavigation items: '+designPreview.navigation.join(' / '),'Sections (in order):\n'+designPreview.sections.map((section,index)=>(index+1)+'. '+section.title+' ('+section.type+', '+section.columns+' columns)\n'+section.body+(section.action?'\nAction: '+section.action:'')+section.items.map(item=>'\n- '+item.title+': '+item.body+(item.meta?' | '+item.meta:'')+' | Visual: '+item.visual).join('')).join('\n\n'),(designPreview.layout==='components'?'Apply only these component changes within the existing UI. Preserve unrelated layout, navigation and behavior. This specimen board is not a page to build.':'Preserve this navigation, content hierarchy and component structure. Media and chart data in the preview are illustrative; replace them with supplied real data.')].join('\n\n');
}
function editablePlan(plan){
 return plan.split(/(?=^#{1,3} )/m).filter(section=>!/^#{1,3} (?:Navigation|Components|Visual Direction|Color|Typography|Spacing|Layout|Design Tokens)/i.test(section.trim())).join('').trim();
}
function ensureInlineDraft(){
 if(inlineDraft)return;
 const existing=inlineGeneratedSkill||(previewSourceId&&skill.id===previewSourceId&&!skill.projectDraft?skill:null);
 inlineDraft={purpose:existing?.purpose||$('description').value,requirements:editablePlan($('referencePlan').value),
 instructions:existing?.instructions.filter(x=>!/^Use these approved visual tokens exactly:|^Implement the approved page composition|^Read the accompanying PROJECT-SPEC|font|typograph|#[0-9a-f]{6}|spacing of|border radius|hero section|article cards|two-column|top header/i.test(x)).join('\n')||['Confirm scope, audience, required screens and open questions before implementation.','Implement the supplied design requirements using the synced visual rules.','Build reusable components with clear hover, focus, active, disabled, loading, empty and error states.','Implement real navigation and interactions; identify mock data and missing integrations explicitly.',$('designPlatform').value==='web'?'Test responsive layouts, keyboard navigation, semantic HTML and accessible contrast.':'Confirm the native framework; handle safe areas, system navigation, keyboard avoidance and scalable text. Use minimum 44pt iOS or 48dp Android touch targets and test on a simulator or device.','Verify the result against the preview and report completed work, assumptions and remaining limitations.'].join('\n'),
 inputs:existing?.inputs.join('\n')||'Project brief and reference requirements\nCurrent visual rules and page composition\nContent, assets and implementation environment',outputs:existing?.outputs.join('\n')||'Implemented UI and reusable components\nDesign tokens and component documentation\nVerification results and remaining limitations'};
 for(const [key,id] of Object.entries(inlineFields))$(id).value=inlineDraft[key];
}
window.currentInlinePackage=()=>{
 const lines=value=>value.split('\n').map(x=>x.trim()).filter(Boolean);
 const instructions=['Read PROJECT-SPEC.md and confirm scope and acceptance criteria.','Apply the following synced visual rules:\n'+visualSkillRules(),'Follow these project requirements (synced visual rules override conflicting visual details):\n'+inlineDraft.requirements,...lines(inlineDraft.instructions)];
 return {name:$('projectName').value.trim(),purpose:inlineDraft.purpose,instructions,inputs:lines(inlineDraft.inputs),outputs:lines(inlineDraft.outputs),projectSpec:['# '+$('projectName').value+' - Design specification','## Purpose',inlineDraft.purpose,'## Synced visual rules',visualSkillRules(),'## Project requirements and reference notes',inlineDraft.requirements,'## Implementation and acceptance checks',inlineDraft.instructions,'## Inputs',inlineDraft.inputs,'## Deliverables',inlineDraft.outputs].join('\n\n')};
};
window.syncInlineSkill=()=>{
 if(!designPreview||!designTokens)return;
 const first=inlineSkillPanel.hidden;ensureInlineDraft();inlineSkillPanel.hidden=false;
 if(first)for(const [key,id] of Object.entries(inlineFields))$(id).value=inlineDraft[key];
 syncSkillDocument();$('inlineFullFile').textContent=fileText(window.currentInlinePackage());
 $('inlineSyncStatus').textContent=pendingPreview?'Showing your current version. Apply the proposed changes to sync them here.':'Synced with your current preview';
 for(const id of ['downloadInlineSkill','downloadInlineSpec'])$(id).disabled=Boolean(referenceController||pendingPreview);
};
window.setInlineSkillBusy=busy=>{
 inlineSkillPanel.classList.toggle('syncing',busy);$('inlineVisualRules').setAttribute('aria-busy',String(busy));
 $('inlineSyncStatus').textContent=busy?'Updating preview rules...':'Synced with your current preview';
 for(const id of ['downloadInlineSkill','downloadInlineSpec'])$(id).disabled=busy||Boolean(pendingPreview);
};
for(const [key,id] of Object.entries(inlineFields))$(id).addEventListener('input',()=>{inlineDraft[key]=$(id).value;scheduleProjectSave()});
new MutationObserver(()=>{$('inlineSaveStatus').textContent=$('projectSaveStatus').textContent}).observe($('projectSaveStatus'),{childList:true,subtree:true,characterData:true});
function downloadInlineDocument(spec){
 if(referenceController||pendingPreview){toast('Finish reviewing the preview changes first.');return}
 if(!inlineDraft?.documentBefore?.trim()||!inlineDraft?.documentAfter?.trim()){toast('Complete your Skill document before downloading.');return}
 if(!$('projectName').value.trim()){$('projectName').focus();toast('Enter a project name.');return}
 flushProjectSave();const data=window.currentInlinePackage();const url=URL.createObjectURL(new Blob([spec?data.projectSpec:fileText(data)],{type:'text/markdown;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=spec?'PROJECT-SPEC.md':'SKILL.md';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
$('downloadInlineSkill').onclick=()=>downloadInlineDocument(false);$('downloadInlineSpec').onclick=()=>downloadInlineDocument(true);
const originalCloseComparison=closeComparison;closeComparison=function(){originalCloseComparison();window.syncInlineSkill?.()};
const originalShowComparison=showComparison;showComparison=function(...args){originalShowComparison(...args);window.syncInlineSkill?.()};

async function prepareInlineSkill(){
 inlineSkillPanel.hidden=false;
 $('inlineGenerationStatus').textContent='Writing implementation instructions from your design direction...';
 $('retryInlineSkill').hidden=true;
 try{
  const data=await referenceRequest('/api/references/generate',{goal:designGoal(),plan:$('referencePlan').value,tokens:clone(designTokens),preview:clone(designPreview)});
  inlineGeneratedSkill=data.skill;inlineDraft=null;ensureInlineDraft();window.syncInlineSkill();
  $('inlineGenerationStatus').textContent='AI implementation instructions ready. Review and edit them before downloading.';
 }catch(e){
  if(!designPreview||referencePanel.hidden)return;
  window.syncInlineSkill();$('inlineGenerationStatus').textContent='Implementation generation failed. Showing a basic draft from your design plan. '+e.message;
  $('retryInlineSkill').hidden=false;
 }
}
$('retryInlineSkill').onclick=async()=>{flushProjectSave();await prepareInlineSkill();scheduleProjectSave()};

function ensureSkillDocument(){
 if(typeof inlineDraft.documentBefore==='string'&&typeof inlineDraft.documentAfter==='string')return;
 const bullet=value=>value.split('\n').filter(x=>x.trim()).map(x=>'- '+x).join('\n');
 const name=$('projectName').value.trim()||'Untitled skill';
 const slug=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,64)||'custom-skill';
 inlineDraft.documentBefore=['---','name: '+slug,'description: '+JSON.stringify(inlineDraft.purpose),'---','','# '+name,'','## Purpose',inlineDraft.purpose,'','## Inputs',bullet(inlineDraft.inputs)].join('\n');
 inlineDraft.documentAfter=['## Instructions',inlineDraft.instructions.split('\n').filter(x=>x.trim()).map((x,i)=>(i+1)+'. '+x).join('\n'),'','## Project context',inlineDraft.requirements,'','## Outputs',bullet(inlineDraft.outputs)].join('\n');
}
function lockedSkillText(){return '## Visual rules - synced from Preview & refine\n\n'+visualSkillRules()}
function fullSkillDocument(){ensureSkillDocument();return inlineDraft.documentBefore+'\n\n'+lockedSkillText()+'\n\n'+inlineDraft.documentAfter+'\n'}
function sizeSkillText(element){const scroller=element.closest?.('.skill-document'),position=scroller?.scrollTop;element.style.height='auto';element.style.height=element.scrollHeight+'px';if(scroller)scroller.scrollTop=position}
function syncSkillDocument(){
 ensureSkillDocument();
 for(const [key,id] of [['documentBefore','skillDocumentBefore'],['documentAfter','skillDocumentAfter']]){const element=$(id);if(element.value!==inlineDraft[key])element.value=inlineDraft[key];sizeSkillText(element)}
 $('inlineVisualRules').textContent=lockedSkillText();window.refreshSkillUndo?.();
}
const structuredInlinePackage=window.currentInlinePackage;
window.currentInlinePackage=()=>{
 const result=structuredInlinePackage();const markdown=fullSkillDocument();
 result.skillMarkdown=markdown;
 // Execution receives the same full document the user edits and downloads.
 result.instructions=['Use the following consecutive document parts as the authoritative Skill. The gray visual section is represented by the synced visual rules heading. Follow those rules over conflicting visual details.',...markdown.match(/[\s\S]{1,4000}/g)];
 result.projectSpec='# '+result.name+' - Design specification\n\nThe following Skill document defines the current requirements. Its synced visual rules take precedence over conflicting visual details.\n\n'+markdown;
 return result;
};
for(const [key,id] of [['documentBefore','skillDocumentBefore'],['documentAfter','skillDocumentAfter']])$(id).addEventListener('input',event=>{recordSkillEdit(key,event);inlineDraft[key]=$(id).value;sizeSkillText($(id));scheduleProjectSave()});
window.addEventListener('resize',()=>{if(!inlineSkillPanel.hidden){sizeSkillText($('skillDocumentBefore'));sizeSkillText($('skillDocumentAfter'))}});

// Reuse the editor in a modal so edits, readonly rules and autosave keep one state.
const fullscreenSkillButton=document.createElement('button');
fullscreenSkillButton.id='fullscreenSkill';fullscreenSkillButton.type='button';fullscreenSkillButton.textContent='Full screen';fullscreenSkillButton.setAttribute('aria-haspopup','dialog');fullscreenSkillButton.setAttribute('aria-expanded','false');
const skillHeaderActions=document.createElement('div');skillHeaderActions.className='skill-header-actions';
skillHeaderActions.append($('inlineSaveStatus'),fullscreenSkillButton);inlineSkillPanel.querySelector('.inline-skill-head').insertBefore(skillHeaderActions,$('inlineSyncStatus'));
const skillFullscreenDialog=document.createElement('dialog');skillFullscreenDialog.className='skill-fullscreen-dialog';skillFullscreenDialog.setAttribute('aria-label','Fullscreen Skill editor');document.body.append(skillFullscreenDialog);
let skillEditorPlaceholder=null,skillPageScroll=0,previousBodyOverflow='';
function resizeSkillEditor(){const fraction=skillDocument.scrollTop/Math.max(1,skillDocument.scrollHeight-skillDocument.clientHeight);sizeSkillText($('skillDocumentBefore'));sizeSkillText($('skillDocumentAfter'));skillDocument.scrollTop=fraction*Math.max(0,skillDocument.scrollHeight-skillDocument.clientHeight)}
function openSkillFullscreen(){
 if(skillFullscreenDialog.open)return;
 skillPageScroll=window.scrollY;previousBodyOverflow=document.body.style.overflow;
 skillEditorPlaceholder=document.createElement('div');skillEditorPlaceholder.style.height=inlineSkillPanel.getBoundingClientRect().height+'px';inlineSkillPanel.before(skillEditorPlaceholder);
 skillFullscreenDialog.append(inlineSkillPanel);skillFullscreenDialog.showModal();document.body.style.overflow='hidden';
 fullscreenSkillButton.hidden=true;skillFullscreenBack.hidden=false;fullscreenSkillButton.setAttribute('aria-expanded','true');resizeSkillEditor();skillFullscreenBack.focus({preventScroll:true});
}
skillFullscreenDialog.addEventListener('close',()=>{
 flushProjectSave();skillEditorPlaceholder?.replaceWith(inlineSkillPanel);skillEditorPlaceholder=null;
 document.body.style.overflow=previousBodyOverflow;fullscreenSkillButton.hidden=false;skillFullscreenBack.hidden=true;fullscreenSkillButton.textContent='Full screen';fullscreenSkillButton.setAttribute('aria-expanded','false');resizeSkillEditor();window.scrollTo(0,skillPageScroll);fullscreenSkillButton.focus({preventScroll:true});
});
fullscreenSkillButton.onclick=()=>skillFullscreenDialog.open?skillFullscreenDialog.close():openSkillFullscreen();
document.addEventListener('skill-reset',()=>{if(skillFullscreenDialog.open)skillFullscreenDialog.close()});
$('new').addEventListener('click',()=>{if(skillFullscreenDialog.open)skillFullscreenDialog.close()});

const skillFullscreenBack=document.createElement('button');skillFullscreenBack.id='skillFullscreenBack';skillFullscreenBack.type='button';skillFullscreenBack.textContent='\u2190 Back';skillFullscreenBack.hidden=true;skillFullscreenBack.onclick=()=>skillFullscreenDialog.close();
inlineSkillPanel.prepend(skillFullscreenBack);
const copySkillButton=document.createElement('button');copySkillButton.id='copySkill';copySkillButton.type='button';copySkillButton.textContent='Copy';copySkillButton.setAttribute('aria-label','Copy complete Skill');
skillHeaderActions.insertBefore(copySkillButton,fullscreenSkillButton);
const copySkillStatus=document.createElement('span');copySkillStatus.className='skill-copy-status';copySkillStatus.setAttribute('role','status');skillHeaderActions.append(copySkillStatus);
let copySkillTimer=null;
// Text undo tracks only editable document content, never the synced visual rules.
const undoSkillButton=document.createElement('button');undoSkillButton.id='undoSkillText';undoSkillButton.type='button';undoSkillButton.textContent='\u21b6';undoSkillButton.title='Undo (Ctrl/Cmd+Z)';undoSkillButton.className='skill-history-button';undoSkillButton.disabled=true;undoSkillButton.setAttribute('aria-label','Undo Skill text edit');skillHeaderActions.insertBefore(undoSkillButton,copySkillButton);
const redoSkillButton=document.createElement('button');redoSkillButton.id='redoSkillText';redoSkillButton.type='button';redoSkillButton.textContent='\u21b7';redoSkillButton.title='Redo (Ctrl/Cmd+Shift+Z)';redoSkillButton.className='skill-history-button';redoSkillButton.disabled=true;redoSkillButton.setAttribute('aria-label','Redo Skill text edit');skillHeaderActions.insertBefore(redoSkillButton,copySkillButton);
let skillUndoOwner=null,skillUndoHistory=[],skillRedoHistory=[],skillUndoGroup=null,skillBeforeEdit=null;
window.refreshSkillUndo=()=>{
 if(skillUndoOwner!==inlineDraft){skillUndoOwner=inlineDraft;skillUndoHistory=[];skillRedoHistory=[];skillUndoGroup=null;skillBeforeEdit=null}
 undoSkillButton.disabled=!skillUndoHistory.length||Boolean(referenceController);redoSkillButton.disabled=!skillRedoHistory.length||Boolean(referenceController);
};
function recordSkillEdit(key,event){
 window.refreshSkillUndo();if(!inlineDraft||inlineDraft[key]===event.target.value)return;
 skillRedoHistory=[];const now=Date.now(),type=event.inputType||'replace';
 const grouped=skillUndoGroup&&skillUndoGroup.key===key&&skillUndoGroup.type===type&&now-skillUndoGroup.time<800&&['insertText','deleteContentBackward','deleteContentForward'].includes(type)&&!event.isComposing;
 if(!grouped){skillUndoHistory.push({documentBefore:inlineDraft.documentBefore,documentAfter:inlineDraft.documentAfter,key,start:skillBeforeEdit?.key===key?skillBeforeEdit.start:0,end:skillBeforeEdit?.key===key?skillBeforeEdit.end:0});if(skillUndoHistory.length>50)skillUndoHistory.shift()}
 skillUndoGroup={key,type,time:now};skillBeforeEdit=null;window.refreshSkillUndo();
}
function restoreSkillHistory(from,to){
 const snapshot=from.pop();const field=$(snapshot.key==='documentBefore'?'skillDocumentBefore':'skillDocumentAfter');
 to.push({documentBefore:inlineDraft.documentBefore,documentAfter:inlineDraft.documentAfter,key:snapshot.key,start:field.selectionStart||0,end:field.selectionEnd||0});
 inlineDraft.documentBefore=snapshot.documentBefore;inlineDraft.documentAfter=snapshot.documentAfter;skillUndoGroup=null;skillBeforeEdit=null;
 scheduleProjectSave();field.focus({preventScroll:true});field.setSelectionRange(snapshot.start,snapshot.end);window.refreshSkillUndo();
}
function undoSkillText(){window.refreshSkillUndo();if(!undoSkillButton.disabled)restoreSkillHistory(skillUndoHistory,skillRedoHistory)}
function redoSkillText(){window.refreshSkillUndo();if(!redoSkillButton.disabled)restoreSkillHistory(skillRedoHistory,skillUndoHistory)}
undoSkillButton.onclick=undoSkillText;redoSkillButton.onclick=redoSkillText;
for(const [key,id] of /* undo fields */ [['documentBefore','skillDocumentBefore'],['documentAfter','skillDocumentAfter']]){
 $(id).addEventListener('beforeinput',event=>{skillBeforeEdit={key,start:event.target.selectionStart,end:event.target.selectionEnd}});
 $(id).addEventListener('blur',()=>{skillUndoGroup=null});
 $(id).addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&!event.altKey&&!event.isComposing){const key=event.key.toLowerCase();if(key==='z'){event.preventDefault();event.shiftKey?redoSkillText():undoSkillText()}else if(key==='y'&&event.ctrlKey){event.preventDefault();redoSkillText()}}});
}

// Fullscreen preview reuses the rendered page and retains its current viewport mode.
const fullscreenPreviewButton=document.createElement('button');fullscreenPreviewButton.id='fullscreenPreview';fullscreenPreviewButton.type='button';fullscreenPreviewButton.textContent='Full screen';fullscreenPreviewButton.setAttribute('aria-label','Open fullscreen visual preview');fullscreenPreviewButton.setAttribute('aria-haspopup','dialog');fullscreenPreviewButton.setAttribute('aria-expanded','false');previewStage.querySelector('.preview-stage-head').append(fullscreenPreviewButton);
const previewFullscreenDialog=document.createElement('dialog');previewFullscreenDialog.className='preview-fullscreen-dialog';previewFullscreenDialog.setAttribute('aria-label','Fullscreen visual preview');document.body.append(previewFullscreenDialog);
const previewFullscreenBack=document.createElement('button');previewFullscreenBack.id='previewFullscreenBack';previewFullscreenBack.type='button';previewFullscreenBack.textContent='\u2190 Back';previewFullscreenBack.hidden=true;previewStage.prepend(previewFullscreenBack);
const fullscreenRefineDock=document.createElement('div');fullscreenRefineDock.className='fullscreen-refine-dock';fullscreenRefineDock.hidden=true;previewStage.append(fullscreenRefineDock);
let fullscreenRefineAnchors=[];
let previewPlaceholder=null,previewPageScroll=0,previewBodyOverflow='';
fullscreenPreviewButton.onclick=()=>{
 if(previewFullscreenDialog.open)return;
 previewPageScroll=window.scrollY;previewBodyOverflow=document.body.style.overflow;
 previewPlaceholder=document.createElement('div');previewPlaceholder.style.height=previewStage.getBoundingClientRect().height+'px';previewStage.before(previewPlaceholder);
 previewFullscreenDialog.append(previewStage);fullscreenPreviewButton.hidden=true;fullscreenPreviewButton.setAttribute('aria-expanded','true');previewFullscreenBack.hidden=false;
 fullscreenRefineAnchors=[comparison,previewRefinement,$('cancelReferences')].map(node=>{const anchor=document.createComment('Fullscreen refinement return point');node.before(anchor);fullscreenRefineDock.append(node);return {node,anchor}});fullscreenRefineDock.hidden=false;
 previewFullscreenDialog.showModal();document.body.style.overflow='hidden';previewFullscreenBack.focus({preventScroll:true});
};
previewFullscreenBack.onclick=()=>previewFullscreenDialog.close();
previewFullscreenDialog.addEventListener('close',()=>{
 for(const {node,anchor} of fullscreenRefineAnchors)anchor.replaceWith(node);fullscreenRefineAnchors=[];fullscreenRefineDock.hidden=true;
 previewPlaceholder?.replaceWith(previewStage);previewPlaceholder=null;document.body.style.overflow=previewBodyOverflow;
 fullscreenPreviewButton.hidden=false;fullscreenPreviewButton.setAttribute('aria-expanded','false');previewFullscreenBack.hidden=true;
 window.scrollTo(0,previewPageScroll);fullscreenPreviewButton.focus({preventScroll:true});
});
document.addEventListener('skill-reset',()=>{if(previewFullscreenDialog.open)previewFullscreenDialog.close()});
$('new').addEventListener('click',()=>{if(previewFullscreenDialog.open)previewFullscreenDialog.close()});

copySkillButton.onclick=async()=>{
 if(!inlineDraft||!designPreview){copySkillStatus.textContent='Your Skill is still being prepared.';return}
 clearTimeout(copySkillTimer);copySkillStatus.textContent='';
 try{await navigator.clipboard.writeText(fullSkillDocument());copySkillButton.textContent='Copied!';copySkillStatus.textContent='Complete Skill copied.';copySkillTimer=setTimeout(()=>{copySkillButton.textContent='Copy';copySkillStatus.textContent=''},2500)}
 catch{copySkillButton.textContent='Copy';copySkillStatus.textContent='Copy failed. Please try again.'}
};
