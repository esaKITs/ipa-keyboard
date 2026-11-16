/* Shared IPA font choices. Regular webfonts are distributed with their OFL notices. */
(()=>{
'use strict';
let shared;try{shared=parent!==window?parent.esaIPAFonts:null;}catch(e){}
const base=new URL('.',document.currentScript.src);
if(!shared){
 const options=Object.freeze([
  {key:'doulos',name:'Doulos SIL',family:'Doulos SIL Local',file:'DoulosSIL-Regular.woff2'},
  {key:'andika',name:'Andika',family:'Andika Local',file:'Andika-Regular.woff2'}
 ]);
 const find=key=>options.find(o=>o.key===key)||options[0];
 shared={options,family:key=>find(key).family,prepare(doc){
  if(doc.getElementById('shared-ipa-font-faces'))return;
  const style=doc.createElement('style');style.id='shared-ipa-font-faces';style.textContent=options.slice(1).map(o=>`@font-face{font-family:'${o.family}';src:url('${new URL('fonts/'+o.file,base)}') format('woff2');font-weight:400;font-style:normal;font-display:swap}`).join('\n');doc.head.appendChild(style);
 },async load(doc,key){
  this.prepare(doc);const option=find(key),loaded=await doc.fonts.load('32px "'+option.family+'"','aɪəɯŋʃʰ̃');if(!loaded.length)throw Error('IPA font unavailable: '+key);return option;
 },async apply(doc,key){
  const option=await this.load(doc,key);doc.documentElement.style.setProperty('--ipa-font','"'+option.family+'"');doc.documentElement.dataset.ipaFont=option.key;doc.defaultView.dispatchEvent(new doc.defaultView.Event('esa-ipa-font-change'));return option;
 }};
}
window.esaIPAFonts=shared;shared.prepare(document);
})();
