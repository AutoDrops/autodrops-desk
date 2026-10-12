(function(g){
const SECS=[["ship","Відправки сьогодні","📦"],["local","Замовлення на місці","🏪"],["clients","Клієнти","👤"],["tasks","Задачі","✅"],["notes","Нотатки","📝"],["buy","Купити/замовити","🛒"]];
const PHONE=/(?:\+?38)?\s?\(?0\d{2}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/;
const NPW='(?<!\\p{L})(?:нп|нова\\s*пошта|відділенн\\p{L}*|поштомат\\p{L}*|відд?\\.?)(?!\\p{L})';const NP=new RegExp(NPW,'iu');
function normPhone(p){let d=p.replace(/\D/g,"");if(d.length===10)d="38"+d;return "+"+d}
function detect(s){const l=s.toLowerCase();
 if(/(?<!\p{L})(купити|замовити|докупити|купить|заказать)(?!\p{L})/u.test(l))return"buy";
 if(NP.test(l)||/(накладк|накладен|післяплат|відправ)/u.test(l))return"ship";
 if(/^(клієнт|контакт)(?!\p{L})/u.test(l))return"clients";
 if(/^(нотатка|замітка|note)(?!\p{L})/u.test(l))return"notes";
 if(/(на місці|самовивіз|забере|прийде|заїде)/.test(l))return"local";
 if(/^(задача|зробити|треба|не забути|подзвонити|передзвонити)(?!\p{L})/iu.test(l))return"tasks";
 if(PHONE.test(s))return"clients";
 return"tasks"}
function parse(s,sec){s=s.trim();sec=sec||detect(s);const o={sec,raw:s,text:s};let rest=s;
 const pm=s.match(PHONE);if(pm){o.phone=normPhone(pm[0]);rest=rest.replace(pm[0]," ")}
 if(sec==="ship"||sec==="local"){
  const cod=/(накладк\p{L}*|накладен\p{L}*(\s*плат\p{L}*)?|післяплат\p{L}*|наложк\p{L}*)/iu;if(cod.test(rest)){o.cod=true;rest=rest.replace(cod," ")}
  const am=rest.match(/(\d[\d\s]{1,7})\s*(грн|₴|uah)/i)||rest.match(/(?:^|\s)(\d{3,6})(?=\s|$)(?![\s\S]*\b\d{3,6}\b)/);
  const np=rest.match(new RegExp(NPW+'\\s*№?\\s*(\\d+)','iu'));
  if(np){o.branch=np[1];const after=rest.slice(rest.indexOf(np[0])+np[0].length).match(/^[\s,]*([А-ЯІЇЄҐ][а-яіїєґ'’-]+)/u);const before=rest.slice(0,rest.indexOf(np[0])).match(/([А-ЯІЇЄҐ][а-яіїєґ'’-]+)[\s,]*$/u);
   if(after){o.city=after[1];rest=rest.replace(np[0]+after[0].slice(0,0),' ').replace(new RegExp('(^|\\s)'+after[1]+'(?!\\p{L})','u'),' ')}
   rest=rest.replace(np[0]," ")}
  if(am){o.amount=+am[1].replace(/\s/g,"");rest=rest.replace(am[0]," ")}
  rest=rest.replace(/\s+/g," ").trim();
  // ПІБ = перші 2-3 слова з великої літери
  const nm=rest.match(/^((?:[А-ЯІЇЄҐA-Z][а-яіїєґa-z'’-]+\s?){2,3})/);
  if(nm){o.name=nm[1].trim();rest=rest.slice(nm[0].length).trim()}
  // місто: слово з великої після номера НП
  
  o.item=rest.replace(/^[,;\-\s]+|[,;\-\s]+$/g,"");o.sent=false;delete o.text}
 else if(sec==="clients"){o.name=rest.replace(/^(клієнт|контакт)\s*:?/i,"").replace(/\s+/g," ").trim();delete o.text}
 else{o.text=s.replace(/^(купити|замовити|задача|нотатка|замітка)\s*:?\s*/iu,"")||s;o.done=false}
 return o}
g.AppParse={SECS,detect,parse};if(typeof module!=="undefined")module.exports=g.AppParse;
})(typeof window!=="undefined"?window:globalThis);
