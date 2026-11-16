/* Display-only IPA mark placement. Software: LICENSE-MIT.txt. Outline sources: OFL notices in fonts/. */
(()=>{
'use strict';
const out=document.getElementById('out'),NS='http://www.w3.org/2000/svg';
const fixed=new Set(['\u032c','\u030c','\u0330','\u0303','\u0324','\u0308','\u032a','\u0346']);
const spacing=new Set(['ʰ','ʷ','ʲ','ˠ','ˤ','˞','ⁿ','ˡ']);
const surface=document.createElement('div');surface.className='ipa-output-surface';out.before(surface);surface.appendChild(out);
const visual=document.createElement('div');visual.id='outVisual';visual.hidden=true;visual.setAttribute('aria-hidden','true');surface.appendChild(visual);
const inner=document.createElement('div');inner.id='outVisualText';visual.appendChild(inner);
const ctx=document.createElement('canvas').getContext('2d');let data=null,text=out.value,records=[],scheduled=0,refreshing=false,everPositioned=false,pendingEdit=null;
const eligible=c=>!fixed.has(c)&&(/\p{M}/u.test(c)||spacing.has(c));
function splice(a,b,insert,pos){
 const delta=insert.length-(b-a);records=records.filter(r=>r.index<a||r.index>=b).map(r=>({...r,index:r.index>=b?r.index+delta:r.index}));
 if(pos==='above'||pos==='below'){let n=a;for(const c of insert){if(eligible(c))records.push({index:n,char:c,position:pos});n+=c.length;}everPositioned=true;}
 text=text.slice(0,a)+insert+text.slice(b);records.sort((a,b)=>a.index-b.index);queue();
}
function reconcile(){const next=out.value;if(next===text){pendingEdit=null;return;}if(pendingEdit){const {a,b}=pendingEdit;pendingEdit=null;const n=next.length-(text.length-(b-a));if(n>=0&&next.slice(0,a)===text.slice(0,a)&&next.slice(a+n)===text.slice(b)){splice(a,b,next.slice(a,a+n),'auto');return;}}let a=0,b=text.length,c=next.length;while(a<b&&a<c&&text[a]===next[a])a++;while(b>a&&c>a&&text[b-1]===next[c-1]){b--;c--;}splice(a,b,next.slice(a,c),'auto');}
function capture(){reconcile();return records.map(r=>({...r}));}
function restore(value,positions){text=value;records=positions.filter(r=>eligible(r.char)&&value.slice(r.index,r.index+r.char.length)===r.char).map(r=>({...r}));everPositioned=everPositioned||records.length>0;queue();}
function wrap(a,b,l,r,next){records=records.map(p=>({...p,index:p.index+(p.index>=a?l.length:0)+(p.index>=b?r.length:0)}));text=next;queue();}
function clusters(){const result=[];let index=0;const map=new Map(records.map(r=>[r.index,r]));for(const c of text){const positioned=map.get(index),last=result.at(-1);if(last&&!/\s/u.test(last.raw)&&(/\p{M}/u.test(c)||positioned)){last.raw+=c;if(positioned)last.marks.push(positioned);}else result.push({raw:c,index,marks:positioned?[positioned]:[]});index+=c.length;}return result;}
function baseline(){const b=document.createElement('span');b.className='display-baseline';return b;}
function svgMark(mark,font,size){
 const glyph=font.marks[mark.char];if(!glyph)return null;const [x0,y0,x1,y1]=glyph.box,w=(x1-x0)*size/font.units,h=(y1-y0)*size/font.units;
 const svg=document.createElementNS(NS,'svg');svg.setAttribute('class','display-mark');svg.dataset.char=mark.char;svg.dataset.position=mark.position;svg.dataset.index=String(mark.index);svg.setAttribute('viewBox',`${x0} ${-y1} ${x1-x0} ${y1-y0}`);svg.style.width=w+'px';svg.style.height=h+'px';svg.style.left='50%';svg.style.transform='translateX(-50%)';
 const path=document.createElementNS(NS,'path');path.setAttribute('d',glyph.path);path.setAttribute('transform','scale(1,-1)');svg.appendChild(path);return{svg,height:h};
}
function refresh(){
 if(refreshing)return false;refreshing=true;let changed=false;
 try{
  reconcile();const font=data?.fonts[document.documentElement.dataset.ipaFont||'doulos'];
  if(!font||!records.length){visual.hidden=true;out.classList.remove('visual-positioned');if(out.style.lineHeight){out.style.lineHeight='';changed=true;}return changed;}
  let style=getComputedStyle(out),size=parseFloat(style.fontSize),gap=Math.max(1,size*.06);ctx.font=style.font;
  const rows=clusters();let needed=size*1.35;
  const ascent=ctx.measureText('Mg').fontBoundingBoxAscent||font.ascent*size/font.units,descent=ctx.measureText('Mg').fontBoundingBoxDescent||font.descent*size/font.units;
  for(const row of rows){
   row.marks=row.marks.filter(m=>font.marks[m.char]);if(!row.marks.length)continue;
   const omit=new Set(row.marks.map(m=>m.index));let n=row.index;row.base='';for(const c of row.raw){if(!omit.has(n))row.base+=c;n+=c.length;}if(!row.base)row.base='◌';
   row.metrics=ctx.measureText(row.base);row.up=0;row.down=0;for(const mark of row.marks){const g=font.marks[mark.char],height=(g.box[3]-g.box[1])*size/font.units+gap;if(mark.position==='above')row.up+=height;else row.down+=height;}
   needed=Math.max(needed,ascent+descent+2*(row.metrics.actualBoundingBoxAscent+row.up-ascent)+2,ascent+descent+2*(row.metrics.actualBoundingBoxDescent+row.down-descent)+2);
  }
  const line=Math.ceil(needed);if(out.style.lineHeight!==line+'px'){out.style.lineHeight=line+'px';changed=true;}style=getComputedStyle(out);
  visual.hidden=false;out.classList.add('visual-positioned');
  visual.style.left=style.borderLeftWidth;visual.style.top=style.borderTopWidth;visual.style.width=out.clientWidth+'px';visual.style.height=out.clientHeight+'px';
  for(const key of['fontFamily','fontSize','fontWeight','fontStyle','fontVariant','lineHeight','letterSpacing','wordSpacing','textAlign','direction','tabSize'])inner.style[key]=style[key];
  inner.style.width=out.clientWidth+'px';inner.style.padding=`${style.paddingTop} ${style.paddingRight} ${style.paddingBottom} ${style.paddingLeft}`;
  inner.replaceChildren();const placed=[];let plain='';const flush=()=>{if(plain){inner.appendChild(document.createTextNode(plain));plain='';}};
  for(const row of rows){if(!row.marks.length){plain+=row.raw;continue;}flush();
   const cluster=document.createElement('span');cluster.className='display-cluster';const originalBaseline=baseline(),source=document.createElement('span');source.className='display-source';source.textContent=row.raw;cluster.append(originalBaseline,source);
   const base=document.createElement('span');base.className='display-base';const baseBaseline=baseline();base.append(baseBaseline,document.createTextNode(row.base));base.style.left='0';base.style.top='0';cluster.appendChild(base);
   const marks=row.marks.map(m=>svgMark(m,font,size));for(const m of marks)if(m)cluster.appendChild(m.svg);inner.appendChild(cluster);placed.push({row,cluster,originalBaseline,base,baseBaseline,marks});
  }flush();if(text.endsWith('\n'))inner.appendChild(document.createTextNode('\u200b'));
  const scale=out.getBoundingClientRect().width/out.offsetWidth||1;
  for(const p of placed){const top=p.cluster.getBoundingClientRect().top,baseLine=p.originalBaseline.getBoundingClientRect().top;p.base.style.top=((baseLine-p.baseBaseline.getBoundingClientRect().top)/scale)+'px';let up=0,down=0;for(const mark of p.marks){if(!mark)continue;const above=mark.svg.dataset.position==='above';let y;if(above){y=(baseLine-top)/scale-p.row.metrics.actualBoundingBoxAscent-gap-up-mark.height;up+=mark.height+gap;}else{y=(baseLine-top)/scale+p.row.metrics.actualBoundingBoxDescent+gap+down;down+=mark.height+gap;}mark.svg.style.top=y+'px';}}
  scroll();return changed;
 }finally{refreshing=false;}
}
function scroll(){inner.style.transform=`translate(${-out.scrollLeft}px,${-out.scrollTop}px)`;}
function queue(){if(!scheduled)scheduled=requestAnimationFrame(()=>{scheduled=0;const changed=refresh();if(changed)window.esaGrowOutput?.();});}
window.esaDisplayPositions={replace:splice,capture,restore,wrap,refresh,fixed:[...fixed],ready:null};
window.esaDisplayPositions.ready=fetch(new URL('fonts/positioned-diacritics.json',document.currentScript.src)).then(r=>{if(!r.ok)throw Error('outline asset '+r.status);return r.json();}).then(value=>{data=value;queue();return true;}).catch(error=>{window.esaNotify?.(window.esaI18n.t('表示位置の情報を読み込めませんでした。',document.getElementById('languageSelect').value,'panel'),'info');return false;});
out.addEventListener('beforeinput',()=>{pendingEdit={a:out.selectionStart,b:out.selectionEnd};});out.addEventListener('input',queue);out.addEventListener('scroll',scroll,{passive:true});out.addEventListener('keydown',e=>{if(!everPositioned||e.isComposing||!(e.ctrlKey||e.metaKey))return;const k=e.key.toLowerCase();if(k==='z'||k==='y'){e.preventDefault();document.getElementById(k==='y'||e.shiftKey?'redo':'undo').click();}});
new ResizeObserver(queue).observe(out);new MutationObserver(queue).observe(out,{attributes:true,attributeFilter:['style']});window.addEventListener('resize',queue);window.addEventListener('esa-ipa-font-change',queue);window.visualViewport?.addEventListener('resize',queue);document.fonts.ready.then(queue);
})();
