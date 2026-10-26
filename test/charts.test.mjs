import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
class Node {constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.textContent='';}append(...children){this.children.push(...children)}setAttribute(k,v){this.attrs[k]=String(v)}replaceChildren(...children){this.children=children}addEventListener(){}}
const nodes=new Map();const get=id=>{if(!nodes.has(id))nodes.set(id,new Node('div'));return nodes.get(id)};
const context=vm.createContext({document:{createElement:t=>new Node(t),createElementNS:(_,t)=>new Node(t),addEventListener(){}},$:get,fetch:async()=>({ok:true,json:async()=>({configured:false})}),Intl,AbortController,setTimeout,clearTimeout});
vm.runInContext(readFileSync(new URL('../dist/playground.js',import.meta.url),'utf8'),context);
const flatten=n=>[n,...n.children.flatMap(flatten)];
test('bar and line charts support negative, zero and single-point data with matching table values',()=>{for(const type of ['bar','line'])for(const values of [[-5,0,10],[0],[7]]){context.chart={type,title:'Test <script>',unit:'orders',source:'test fixture',points:values.map((value,i)=>({label:'Month '+i,value}))};const card=vm.runInContext('drawChart(chart)',context);const all=flatten(card);assert.ok(all.some(n=>n.tag==='svg'));assert.ok(all.some(n=>n.tag==='table'));assert.equal(all.filter(n=>n.tag==='td').length,values.length*2);assert.equal(all.filter(n=>n.tag==='script').length,0);assert.ok(!JSON.stringify(card).includes('NaN'));assert.ok(!JSON.stringify(card).includes('Infinity'));for(const n of all.filter(n=>n.tag==='rect'))assert.ok(Number(n.attrs.height)>=0);}});
