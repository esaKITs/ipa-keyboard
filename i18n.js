(function(){
'use strict';
const url=new URL('translations.csv',document.currentScript.src).href;
try{if(parent!==window&&parent.esaI18n?.url===url){window.esaI18n=parent.esaI18n;return;}}catch(e){}
let records=[],failed=false;const maps=new Map();
const langs={ja:'ja',en:'en',fa:'fa','pt-BR':'pt_BR','ja-osaka':'ja_osaka'};
function parse(text){
 const rows=[];let row=[],cell='',quoted=false;
 text=text.replace(/^\uFEFF/,'');
 for(let i=0;i<text.length;i++){
  const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(c==='"')quoted=false;else cell+=c;}
  else if(c==='"')quoted=true;
  else if(c===','){row.push(cell);cell='';}
  else if(c==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell='';}
  else cell+=c;
 }
 if(quoted)throw Error('Unclosed CSV quotation');
 if(row.length||cell){row.push(cell.replace(/\r$/,''));rows.push(row);}
 const headers=rows.shift()||[];
 for(const h of ['id','scope','ja','en','fa','pt_BR','ja_osaka'])if(!headers.includes(h))throw Error('Missing translation column '+h);
 const ids=new Set(),keys=new Set();return rows.filter(r=>r.some(Boolean)).map(r=>{
  if(r.length!==headers.length)throw Error('Invalid translation row width');
  const value=Object.fromEntries(headers.map((h,i)=>[h,r[i]]));
  if(!value.id||!value.ja||ids.has(value.id))throw Error('Invalid translation id');ids.add(value.id);
  for(const scope of value.scope.split(/\s+/)){if(!['ui','chart','panel'].includes(scope))throw Error('Invalid translation scope');const key=scope+'\n'+value.ja.trim();if(keys.has(key))throw Error('Duplicate translation key');keys.add(key);}
  return Object.freeze(value);
 });
}
function rows(scope){return records.filter(r=>r.scope.split(/\s+/).includes(scope)).map(r=>({ja:r.ja,en:r.en,fa:r.fa,pt_BR:r.pt_BR,ja_osaka:r.ja_osaka}));}
function t(ja,locale='ja',scope='ui'){
 if(!maps.has(scope))maps.set(scope,new Map(rows(scope).map(r=>[r.ja.trim(),r])));
 const row=maps.get(scope).get(ja.trim());return row?.[langs[locale]||'ja']||ja;
}
const ready=fetch(url).then(r=>{if(!r.ok)throw Error('Translation download failed');return r.text();}).then(text=>{
 records=Object.freeze(parse(text));maps.clear();return records;
}).catch(error=>{failed=true;console.warn('Translations unavailable; Japanese display retained.',error);return records;});
window.esaI18n=Object.freeze({url,ready,rows,t,get failed(){return failed;}});
})();
