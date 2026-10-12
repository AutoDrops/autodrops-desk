const {SECS,detect,parse}=AppParse;const $=s=>document.querySelector(s);
const KEY="autodrops_items_v1";let items=JSON.parse(localStorage.getItem(KEY)||"[]");
let cur=localStorage.getItem("cur")||"ship",q="",qaSec=null,editId=null,sb=null,user=null;
const today=()=>new Date().toISOString().slice(0,10);
const save=()=>localStorage.setItem(KEY,JSON.stringify(items));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const live=()=>items.filter(i=>!i.deleted);
function upsert(it){it.updated=Date.now();const k=items.findIndex(x=>x.id===it.id);k<0?items.unshift(it):items[k]=it;save();render();push(it)}
// ---------- Sync (Supabase) ----------
const C=window.APP_CONFIG||{};
async function initSync(){if(!C.supabaseUrl||!window.supabase){$("#syncState").textContent="💾 Лише локально";return}
 sb=supabase.createClient(C.supabaseUrl,C.supabaseAnonKey);const {data}=await sb.auth.getSession();user=data.session?.user;
 if(!user){$("#login").classList.remove("hidden");return}
 $("#logoutBtn").classList.remove("hidden");await pull();sb.channel("items").on("postgres_changes",{event:"*",schema:"public",table:"items"},pull).subscribe();
 setInterval(pull,30000);addEventListener("focus",pull)}
async function pull(){if(!user)return;const {data,error}=await sb.from("items").select("id,data,updated");if(error){$("#syncState").textContent="⚠️ "+error.message;return}
 const map=new Map(items.map(i=>[i.id,i]));const toPush=[];
 for(const r of data){const l=map.get(r.id);if(!l||l.updated<r.updated)map.set(r.id,{...r.data,id:r.id,updated:r.updated})}
 const remote=new Set(data.map(r=>r.id));for(const i of items){const r=data.find(x=>x.id===i.id);if(!remote.has(i.id)||(r&&r.updated<i.updated))toPush.push(i)}
 items=[...map.values()].sort((a,b)=>b.created-a.created);save();render();for(const i of toPush)push(i);
 $("#syncState").textContent="☁️ Синхронізовано "+new Date().toLocaleTimeString("uk-UA",{hour:"2-digit",minute:"2-digit"})}
async function push(it){if(!user)return;const {error}=await sb.from("items").upsert({id:it.id,user_id:user.id,data:it,updated:it.updated});
 $("#syncState").textContent=error?"⚠️ Не збережено в хмарі":"☁️ Синхронізовано"}
$("#loginBtn").onclick=async()=>{const {error}=await sb.auth.signInWithPassword({email:$("#email").value.trim(),password:$("#pass").value});
 if(error){$("#loginErr").textContent="Невірний email або пароль";return}$("#login").classList.add("hidden");initSync()};
$("#pass").onkeydown=e=>e.key==="Enter"&&$("#loginBtn").click();
$("#logoutBtn").onclick=async()=>{await sb.auth.signOut();location.reload()};
// ---------- Render ----------
function render(){const L=live();
 $("#nav").innerHTML=SECS.map(([k,n,ic],i)=>{const c=L.filter(x=>x.sec===k&&!(x.sent||x.done)).length;return`<a href="#" data-k="${k}" class="${k===cur?"on":""}"><span>${ic} ${n}<kbd>${i+1}</kbd></span><span class="cnt">${c||""}</span></a>`}).join("");
 const s=SECS.find(x=>x[0]===cur);$("#title").textContent=s[2]+" "+s[1];
 let list=L.filter(x=>x.sec===cur);if(cur==="ship")list=list.filter(x=>x.day===today()||!x.sent);
 if(q)list=list.filter(x=>JSON.stringify(x).toLowerCase().includes(q));
 list.sort((a,b)=>(!!(a.sent||a.done))-(!!(b.sent||b.done))||b.created-a.created);
 if(cur==="ship"||cur==="local"){const sum=list.reduce((a,x)=>a+(+x.amount||0),0),cod=list.filter(x=>x.cod).reduce((a,x)=>a+(+x.amount||0),0),sent=list.filter(x=>x.sent).length;
  $("#stats").innerHTML=`<div class="stat"><b>${list.length}</b>Всього</div><div class="stat"><b>${sent}/${list.length}</b>${cur==="ship"?"Відправлено":"Видано"}</div><div class="stat"><b>${sum} ₴</b>Сума</div><div class="stat"><b>${cod} ₴</b>Накладка</div>`}else $("#stats").innerHTML="";
 $("#list").innerHTML=list.length?list.map(card).join(""):`<div class="empty">Порожньо. Натисніть <b>N</b> або <b>＋</b>, щоб додати.</div>`}
function card(x){const d=x.sent||x.done;const chk=`<button class="chk ${d?"on":""}" data-t="${x.id}" title="${x.sec==="ship"?"Відправлено":"Готово"}"></button>`;
 if(x.sec==="ship"||x.sec==="local")return`<div class="item ${d?"done":""}">${chk}<div class="body" data-e="${x.id}"><div class="t">${esc(x.name||"Без імені")} ${x.phone?`· <a href="tel:${x.phone}" style="color:var(--acc)">${esc(x.phone)}</a>`:""}</div>
 <div class="m">${x.sec==="ship"?`📍 ${esc(x.city||"")} ${x.branch?"НП №"+esc(x.branch):""}`:""} ${x.item?"· "+esc(x.item):""}</div>
 ${x.amount?`<span class="tag ${x.cod?"cod":""}">${x.amount} ₴${x.cod?" · накладка":""}</span>`:""}${x.sent?`<span class="tag ok">${x.sec==="ship"?"відправлено":"видано"}</span>`:""}${x.ttn?`<span class="tag">ТТН ${esc(x.ttn)}</span>`:""}</div></div>`;
 if(x.sec==="clients")return`<div class="item"><div class="body" data-e="${x.id}"><div class="t">${esc(x.name)}</div><div class="m">${x.phone?`<a href="tel:${x.phone}" style="color:var(--acc)">${esc(x.phone)}</a>`:""} ${esc(x.note||"")}</div></div></div>`;
 return`<div class="item ${d?"done":""}">${x.sec==="notes"?"":chk}<div class="body" data-e="${x.id}"><div class="t" style="font-weight:500">${esc(x.text)}</div><div class="m">${new Date(x.created).toLocaleDateString("uk-UA")}</div></div></div>`}
$("#nav").onclick=e=>{const a=e.target.closest("a");if(!a)return;e.preventDefault();go(a.dataset.k)};
function go(k){cur=k;localStorage.setItem("cur",k);render()}
$("#list").onclick=e=>{const t=e.target.closest("[data-t]");if(t){const x=items.find(i=>i.id===t.dataset.t);x.sec==="ship"||x.sec==="local"?x.sent=!x.sent:x.done=!x.done;upsert(x);return}
 if(e.target.closest("a"))return;const b=e.target.closest("[data-e]");if(b)openEd(b.dataset.e)};
$("#search").oninput=e=>{q=e.target.value.toLowerCase();render()};
// ---------- Quick add ----------
function openQA(){qaSec=null;$("#qaInput").value="";$("#qa").classList.remove("hidden");qaUpd();$("#qaInput").focus()}
function closeM(){$("#qa").classList.add("hidden");$("#ed").classList.add("hidden")}
function qaUpd(){const v=$("#qaInput").value;const s=qaSec||(v.trim()?detect(v):cur);
 $("#qaSecs").innerHTML=SECS.map(([k,n,ic])=>`<button class="chip ${k===s?"on":""}" data-s="${k}">${ic} ${n}</button>`).join("");
 if(!v.trim()){$("#qaPreview").textContent="Підказка: Tab — змінити розділ, Enter — додати.";return}
 const p=parse(v,s);const lab={name:"ПІБ",phone:"Телефон",city:"Місто",branch:"Відділення НП",item:"Товар",amount:"Сума",cod:"Накладка",text:"Текст"};
 $("#qaPreview").textContent=Object.entries(p).filter(([k,v])=>lab[k]&&v!==""&&v!==undefined).map(([k,v])=>`${lab[k]}: ${v===true?"так":v}`).join("\n")}
$("#qaInput").oninput=qaUpd;
$("#qaInput").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();qaSave()}if(e.key==="Tab"){e.preventDefault();const v=$("#qaInput").value;const s=qaSec||(v.trim()?detect(v):cur);const i=SECS.findIndex(x=>x[0]===s);qaSec=SECS[(i+(e.shiftKey?5:1))%6][0];qaUpd()}};
$("#qaSecs").onclick=e=>{const b=e.target.closest("[data-s]");if(b){qaSec=b.dataset.s;qaUpd();$("#qaInput").focus()}};
function qaSave(){const v=$("#qaInput").value.trim();if(!v)return;const s=qaSec||detect(v);const p=parse(v,s);
 const it={...p,id:uid(),created:Date.now(),day:today()};upsert(it);closeM();go(s);
 if(s==="ship"&&p.phone&&p.name&&!live().some(x=>x.sec==="clients"&&x.phone===p.phone))upsert({id:uid(),sec:"clients",name:p.name,phone:p.phone,note:(p.city||"")+(p.branch?" НП "+p.branch:""),created:Date.now(),day:today()})}
$("#fab").onclick=openQA;$("#qaSave").onclick=qaSave;$("#qaCancel").onclick=closeM;$("#edCancel").onclick=closeM;
$("#qa").onclick=e=>e.target.id==="qa"&&closeM();$("#ed").onclick=e=>e.target.id==="ed"&&closeM();
// ---------- Edit ----------
const FIELDS={ship:[["name","ПІБ"],["phone","Телефон"],["city","Місто"],["branch","Відділення НП / адреса"],["item","Товар"],["amount","Сума, ₴"],["cod","Накладений платіж","chk"],["ttn","ТТН"],["sent","Відправлено","chk"]],
 local:[["name","ПІБ"],["phone","Телефон"],["item","Товар"],["amount","Сума, ₴"],["sent","Видано","chk"]],clients:[["name","ПІБ"],["phone","Телефон"],["note","Нотатка"]],
 tasks:[["text","Задача","area"],["done","Виконано","chk"]],notes:[["text","Нотатка","area"]],buy:[["text","Що купити/замовити","area"],["done","Куплено","chk"]]};
function openEd(id){editId=id;const x=items.find(i=>i.id===id);
 $("#edForm").innerHTML=`<label class="f">Розділ</label><select id="f_sec">${SECS.map(([k,n])=>`<option value="${k}" ${k===x.sec?"selected":""}>${n}</option>`).join("")}</select>`+FIELDS[x.sec].map(([k,l,t])=>t==="chk"?`<label><input type="checkbox" id="f_${k}" ${x[k]?"checked":""} style="width:auto"> ${l}</label>`:t==="area"?`<label class="f">${l}</label><textarea id="f_${k}" rows="4">${esc(x[k])}</textarea>`:`<label class="f">${l}</label><input id="f_${k}" value="${esc(x[k])}">`).join("");
 $("#ed").classList.remove("hidden")}
$("#edSave").onclick=()=>{const x=items.find(i=>i.id===editId);for(const [k,,t] of FIELDS[x.sec]){const el=$("#f_"+k);x[k]=t==="chk"?el.checked:el.value}x.sec=$("#f_sec").value;if(!x.text&&x.sec!=="ship"&&x.sec!=="local"&&x.sec!=="clients")x.text=x.raw||x.item||x.name;upsert(x);closeM()};
$("#edDel").onclick=()=>{if(!confirm("Видалити запис?"))return;const x=items.find(i=>i.id===editId);x.deleted=true;upsert(x);closeM()};
$("#exportBtn").onclick=()=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(live(),null,1)],{type:"application/json"}));a.download="autodrops-"+today()+".json";a.click()};
// ---------- Hotkeys ----------
addEventListener("keydown",e=>{const typing=/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
 if(e.key==="Escape")return closeM();if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();return openQA()}
 if(typing||e.ctrlKey||e.metaKey||e.altKey)return;
 if(e.key==="n"||e.key==="т"||e.key==="+"){e.preventDefault();openQA()}else if(e.key==="/"||e.key==="."){e.preventDefault();$("#search").focus()}else if(/^[1-6]$/.test(e.key))go(SECS[e.key-1][0])});
if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js");
render();initSync();
