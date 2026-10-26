const usageGuide=document.createElement('dialog');
usageGuide.id='usageGuide';usageGuide.className='usage-guide';usageGuide.setAttribute('aria-labelledby','usageTitle');
usageGuide.innerHTML=`<div class="usage-heading"><h3 id="usageTitle">Use your skill anywhere</h3><button id="closeUsage" aria-label="Close usage guide">×</button></div>
<div class="usage-columns"><section><h4>ChatGPT</h4><ol><li>Download SKILL.md and attach it to a chat, or paste its contents.</li><li class="usage-spec" hidden>Also attach PROJECT-SPEC.md to include your project design requirements.</li><li>Copy the starter prompt below, add your input and send it.</li><li>For repeated tasks, add the files to a Project and ask in its project instructions to follow SKILL.md for relevant tasks.</li></ol><p class="muted">Attaching a file provides instructions for the task; it does not install a reusable skill.</p></section>
<section><h4>Codex</h4><ol><li>Place SKILL.md inside this folder in your project:<code id="usagePath"></code></li><li class="usage-spec" hidden>Place PROJECT-SPEC.md alongside SKILL.md.</li><li>In Codex CLI or the IDE extension, select the skill with /skills or mention it using the starter prompt below.</li><li>Provide the requested inputs. If the skill does not appear, restart Codex.</li></ol></section></div>
<div class="usage-heading"><label for="usagePrompt">STARTER PROMPT</label><div class="usage-platforms" role="group" aria-label="Prompt platform"><button id="usageChat" aria-pressed="true">ChatGPT</button><button id="usageCodex" aria-pressed="false">Codex</button><button id="copyUsagePrompt">Copy prompt</button></div></div><textarea id="usagePrompt" rows="5" readonly></textarea>
<div class="usage-heading"><label for="usageExample">EXAMPLE INPUT</label><button id="copyUsageExample">Copy input</button></div><p id="usageExampleNote" class="muted"></p><textarea id="usageExample" rows="6" readonly></textarea>`;
document.body.append(usageGuide);
const usageCopyStatus=document.createElement('p');usageCopyStatus.className='usage-copy-status';usageCopyStatus.setAttribute('role','status');usageGuide.append(usageCopyStatus);
$('howToUse').setAttribute('aria-haspopup','dialog');
let usagePlatform='chat';
function refreshUsageGuide(){
 if(!usageGuide.open)return;
 const s=skill,slug=s.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,64)||'custom-skill';
 $('usagePath').textContent='.agents/skills/'+slug+'/';
 usageGuide.querySelectorAll('.usage-spec').forEach(n=>n.hidden=!s.projectSpec);
 const spec=s.projectSpec?' Follow PROJECT-SPEC.md for the project design requirements.':'';
 $('usagePrompt').value=(usagePlatform==='chat'?'Read the attached SKILL.md and follow its workflow and output requirements. Do not just summarize the file.':'$'+slug+'\nUse this skill to complete the task below.')+spec+'\n\nTask: '+s.purpose+'\n\nInput:\n[Paste the example input below, or your own materials.]\n\nAsk for any missing essential information. Do not invent facts or data.';
 const sample=templateSampleInputs[s.name];
 $('usageExample').value=sample||['Task: '+s.purpose,'',...s.inputs.map(x=>x+': [Add your '+x.toLowerCase()+' here]'),'','Requested output: '+s.outputs.join(', ')].join('\n');
 $('usageExampleNote').textContent=sample?'Synthetic example data. Replace it with your own materials when ready.':'An input starter based on this skill. Replace the bracketed fields with your materials before running.';
 $('usageChat').setAttribute('aria-pressed',String(usagePlatform==='chat'));$('usageCodex').setAttribute('aria-pressed',String(usagePlatform==='codex'));
}
window.refreshUsageGuide=refreshUsageGuide;
function closeUsage(){if(usageGuide.open)usageGuide.close();document.body.classList.remove('usage-modal-open');$('howToUse').setAttribute('aria-expanded','false')}
$('howToUse').onclick=()=>{read();usageCopyStatus.textContent='';usageGuide.showModal();document.body.classList.add('usage-modal-open');$('howToUse').setAttribute('aria-expanded','true');refreshUsageGuide();usageGuide.scrollTop=0;$('closeUsage').focus()};
$('closeUsage').onclick=()=>{closeUsage();$('howToUse').focus()};
$('usageChat').onclick=()=>{usagePlatform='chat';refreshUsageGuide()};$('usageCodex').onclick=()=>{usagePlatform='codex';refreshUsageGuide()};
async function copyUsage(id){try{await navigator.clipboard.writeText($(id).value);usageCopyStatus.textContent='Copied to clipboard.'}catch{$(id).focus();$(id).select();usageCopyStatus.textContent='Select and copy the text with Ctrl+C or Command+C.'}}
$('copyUsagePrompt').onclick=()=>copyUsage('usagePrompt');$('copyUsageExample').onclick=()=>copyUsage('usageExample');
document.addEventListener('skill-reset',closeUsage);
usageGuide.addEventListener('cancel',e=>{e.preventDefault();closeUsage()});
let backdropPointerDown=false;
function outsideUsage(e){const r=usageGuide.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom}
usageGuide.addEventListener('pointerdown',e=>{backdropPointerDown=e.target===usageGuide&&outsideUsage(e)});
usageGuide.addEventListener('click',e=>{if(backdropPointerDown&&e.target===usageGuide&&outsideUsage(e))closeUsage();backdropPointerDown=false});
/* Workspace layout preferences do not modify project contents. */
(() => {
  const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const save = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
  const sidebar = document.querySelector('body > aside');
  sidebar.id = 'workspaceSidebar';
  const header = document.querySelector('.app > header');
  const breadcrumb = header.firstElementChild;
  const navigation = document.createElement('div');
  navigation.className = 'workspace-navigation';
  const toggle = document.createElement('button');
  toggle.id = 'toggleSidebar';
  toggle.type = 'button';
  toggle.setAttribute('aria-controls', sidebar.id);
  toggle.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/></svg>';
  header.prepend(navigation);
  navigation.append(toggle, breadcrumb);
  function setSidebar(collapsed) {
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    sidebar.hidden = collapsed;
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.setAttribute('aria-label', collapsed ? 'Show sidebar' : 'Hide sidebar');
    toggle.title = collapsed ? 'Show sidebar' : 'Hide sidebar';
    save('skillforge-sidebar-collapsed', String(collapsed));
  }
  setSidebar(read('skillforge-sidebar-collapsed') === 'true');
  toggle.onclick = () => setSidebar(!sidebar.hidden);

  const workspace = document.querySelector('.preview-workspace');
  const divider = document.createElement('div');
  divider.className = 'workspace-divider';
  divider.tabIndex = 0;
  divider.setAttribute('role', 'separator');
  divider.setAttribute('aria-label', 'Resize visual preview and Skill editor');
  divider.setAttribute('aria-orientation', 'vertical');
  divider.setAttribute('aria-valuemin', '30');
  divider.setAttribute('aria-valuemax', '70');
  divider.title = 'Drag to resize · Arrow keys to adjust · Double-click to reset';
  workspace.firstElementChild.after(divider);
  let ratio = Number(read('skillforge-preview-width')) || 50;
  function setRatio(value) {
    ratio = Math.max(30, Math.min(70, value));
    workspace.style.setProperty('--preview-share', ratio + 'fr');
    workspace.style.setProperty('--skill-share', (100 - ratio) + 'fr');
    divider.setAttribute('aria-valuenow', String(Math.round(ratio)));
    divider.setAttribute('aria-valuetext', `Preview ${Math.round(ratio)}%, Skill ${100 - Math.round(ratio)}%`);
  }
  setRatio(ratio);
  let dragging = false;
  divider.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault();
    dragging = true;
    divider.focus();
    divider.setPointerCapture(event.pointerId);
    document.body.classList.add('resizing-workspace');
  });
  divider.addEventListener('pointermove', event => {
    if (!dragging) return;
    const rect = workspace.getBoundingClientRect();
    setRatio((event.clientX - rect.left - 10) / (rect.width - 20) * 100);
  });
  function finishDrag() {
    if (!dragging) return;
    dragging = false;
    document.body.classList.remove('resizing-workspace');
    save('skillforge-preview-width', String(ratio));
  }
  divider.addEventListener('pointerup', finishDrag);
  divider.addEventListener('pointercancel', finishDrag);
  divider.addEventListener('lostpointercapture', finishDrag);
  divider.addEventListener('dblclick', () => { setRatio(50); save('skillforge-preview-width', '50'); });
  divider.addEventListener('keydown', event => {
    const next = { ArrowLeft: ratio - 2, ArrowRight: ratio + 2, Home: 30, End: 70 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setRatio(next);
    save('skillforge-preview-width', String(ratio));
  });
  // Textarea height must follow its new column width, including sidebar changes.
  let lastWidth = 0;
  const editor = document.querySelector('.skill-document');
  new ResizeObserver(entries => {
    const width = entries[0].contentRect.width;
    if (width > 0 && Math.abs(width - lastWidth) > 0.5) {
      lastWidth = width;
      resizeSkillEditor();
    }
  }).observe(editor);
})();
