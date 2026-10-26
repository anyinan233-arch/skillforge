let execution=null;
const element=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node};
function drawChart(chart){
 const card=element('section',undefined,'chart-card');card.append(element('h3',chart.title),element('p',chart.unit,'muted'));
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 720 300');svg.setAttribute('role','img');svg.setAttribute('aria-label',chart.title+'. Values are listed in the data table below.');
 const add=(tag,attrs,text)=>{const n=document.createElementNS(svg.namespaceURI,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));if(text!==undefined)n.textContent=text;svg.append(n);return n};
 const values=chart.points.map(p=>p.value);let min=Math.min(0,...values),max=Math.max(0,...values);if(max===min)max=min+1;
 const y=v=>240-(v-min)/(max-min)*210;const x=i=>70+(i+.5)*620/values.length;const zero=y(0);
 for(let i=0;i<=4;i++){const value=min+(max-min)*i/4;add('line',{x1:65,x2:700,y1:y(value),y2:y(value),stroke:'#e7e8ef'});add('text',{x:58,y:y(value)+4,'text-anchor':'end',fill:'#787b90','font-size':12},new Intl.NumberFormat(undefined,{notation:'compact',maximumFractionDigits:1}).format(value));}
 add('line',{x1:65,x2:700,y1:zero,y2:zero,stroke:'#aaa7be'});
 if(chart.type==='line')add('polyline',{points:chart.points.map((p,i)=>`${x(i)},${y(p.value)}`).join(' '),fill:'none',stroke:'#5146d8','stroke-width':3});
 chart.points.forEach((p,i)=>{const n=chart.type==='bar'?add('rect',{x:x(i)-Math.min(32,240/values.length),y:Math.min(y(p.value),zero),width:Math.min(64,480/values.length),height:Math.abs(y(p.value)-zero),fill:'#655ae4',rx:2}):add('circle',{cx:x(i),cy:y(p.value),r:4,fill:'#5146d8'});const title=document.createElementNS(svg.namespaceURI,'title');title.textContent=`${p.label}: ${p.value} ${chart.unit}`;n.append(title);if(i%Math.ceil(values.length/8)===0)add('text',{x:x(i),y:267,'text-anchor':'middle',fill:'#787b90','font-size':12},p.label.length>13?p.label.slice(0,12)+'…':p.label)});
 card.append(svg,element('p',chart.source,'muted'));
 const details=element('details');details.append(element('summary','View chart data'));const table=element('table');const head=element('tr');head.append(element('th','Label'),element('th',chart.unit||'Value'));table.append(head);chart.points.forEach(p=>{const row=element('tr');row.append(element('td',p.label),element('td',String(p.value)));table.append(row)});details.append(table);card.append(details);return card;
}
function displayExecution(data, snapshot){
 const root=$('result');root.replaceChildren();root.append(element('span',data.status==='needs_input'?'More information needed':'AI execution result','tag'),element('h3',data.title),element('p',data.summary));
 if(data.questions.length){const list=element('ul');data.questions.forEach(q=>list.append(element('li',q)));root.append(list)}
 const metrics=element('div',undefined,'metrics-grid');data.metrics.forEach(m=>{const c=element('div',undefined,'metric-card');c.append(element('span',m.label),element('strong',m.value),element('small',m.detail));metrics.append(c)});root.append(metrics);
 data.charts.forEach(c=>root.append(drawChart(c)));data.sections.forEach(s=>{const section=element('section',undefined,'result-section');section.append(element('h3',s.heading),element('p',s.body));root.append(section)});
 data.warnings.forEach(w=>root.append(element('p',w,'execution-warning')));
 const box=element('section',undefined,'feedback-box');box.append(element('h3','Make this skill better'),element('p','What should the skill do differently next time? Review AI changes, then retest with this same input.','muted'));
 const label=element('label','YOUR FEEDBACK');label.htmlFor='testFeedback';const feedback=element('textarea');feedback.id='testFeedback';feedback.rows=3;feedback.placeholder='e.g. Include both requested charts and check all totals.';box.append(label,feedback);
 const suggestions=element('div',undefined,'suggestions');for(const [title,text] of [['Missing charts','Include every requested chart and clearly label its data source.'],['More actionable','Make recommendations specific and actionable.'],['Check accuracy','Verify calculations and distinguish evidence from assumptions.']]){const b=element('button',title);b.onclick=()=>{feedback.value=text;feedback.focus()};suggestions.append(b)}box.append(suggestions);
 const improve=element('button','Improve from this test','primary');improve.onclick=()=>{if(!feedback.value.trim()){feedback.focus();return}if(JSON.stringify(read())!==JSON.stringify(snapshot.skill)){toast('The skill has changed. Run a new test first.');return}refineContext={...snapshot,result:data};refinement(true);$('refine').value=feedback.value.trim();$('reason').textContent='Using this test input and result as context. Changes apply to the reusable skill.';$('copilot').scrollIntoView({behavior:'smooth',block:'start'})};box.append(improve);root.append(box);
}
async function connectionStatus(){try{const r=await fetch('/api/status');if(!r.ok)throw Error();const s=await r.json();$('aiConnection').textContent=s.configured?`AI configured · ${s.model}`:'AI setup required · Configure the local server API key before running.'}catch{$('aiConnection').textContent='Open the AI-enabled preview to run skills. The static preview cannot execute AI.'}}
function cancelExecution(){if(execution)execution.abort()}
function invalidateExecution(){cancelExecution();$('result').replaceChildren()}
$('testInput').addEventListener('input',invalidateExecution);
document.addEventListener('input',e=>{if(e.target.closest('#editPanel'))invalidateExecution()});
['new','workspace','library','add','generate'].forEach(id=>$(id).addEventListener('click',invalidateExecution));
document.addEventListener('skill-reset',invalidateExecution);
$('steps').addEventListener('click',e=>{if(e.target.tagName==='BUTTON')invalidateExecution()});
$('cancelRun').onclick=cancelExecution;
$('chartSample').onclick=()=>{invalidateExecution();$('testInput').value='Create a dashboard with charts from the following sample data. Show monthly orders as a bar chart and revenue as a line chart, plus total orders and revenue. This is synthetic example data.\nMonth,Orders,Revenue\nJanuary,120,4800\nFebruary,150,6000\nMarch,138,5520\nApril,175,7000\nMay,210,8400\nJune,195,7800'};
$('sample').addEventListener('click',invalidateExecution);
$('run').onclick=async()=>{
 if(execution)return;if(!valid()){toast('Complete all skill sections before testing.');return}
 const input=$('testInput').value.trim();if(!input){toast('Add input to run your skill.');return}
 const snapshot={skill:clone(read()),input};connectionStatus();const controller=new AbortController();execution=controller;const timer=setTimeout(()=>controller.abort(),95000);$('run').disabled=true;$('cancelRun').hidden=false;$('result').textContent='Executing your skill with AI…';$('result').setAttribute('aria-busy','true');
 try{const r=await fetch('/api/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(snapshot),signal:controller.signal});let data;try{data=await r.json()}catch{throw Error('The AI server is unavailable. Open the AI-enabled preview.')}if(!r.ok)throw Error(data.error||'The run failed. Try again.');if(!controller.signal.aborted&&JSON.stringify(read())===JSON.stringify(snapshot.skill)&&$('testInput').value.trim()===snapshot.input)displayExecution(data,snapshot)}catch(e){$('result').replaceChildren(element('p',e.name==='AbortError'?'Run cancelled. You can edit the input and try again.':e.message,'execution-warning'))}finally{clearTimeout(timer);execution=null;$('run').disabled=false;$('cancelRun').hidden=true;$('result').setAttribute('aria-busy','false')}
};
connectionStatus();
