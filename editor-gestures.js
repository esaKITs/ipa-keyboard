/* Direct editor geometry and type size. Software: LICENSE-MIT.txt. */
(()=>{
'use strict';
const panel=document.getElementById('floatingEditor'),out=document.getElementById('out'),api=window.esaPanelGeometry,divider=document.getElementById('inputHeightHandle'),widthSlider=document.getElementById('panelWidthSlider');
const handles=[['panelResizeN','n'],['panelResizeW','w'],['panelResizeE','e'],['panelResizeS','s'],['panelResizeNW','nw'],['panelResizeNE','ne'],['panelResizeSW','sw'],['panelResizeSE','se']].map(([id,axis])=>{const b=document.createElement('button');b.type='button';b.id=id;b.className='editor-size-handle';b.dataset.axis=axis;panel.appendChild(b);return b;});
widthSlider.step='1';
let active=null,pinch=null,gesture=null;
const heightKey=()=>`esakits.ipa.input-height.${api.profile()}.v1`;
function savedHeight(){try{const n=Number(localStorage.getItem(heightKey()));return n>=36&&n<=1200?n:null;}catch(e){return null;}}
function apply(){
 const saved=savedHeight();if(saved===null){delete out.dataset.manualHeight;return false;}
 const b=api.bounds(),scale=b.scale,chrome=panel.getBoundingClientRect().height*scale-out.getBoundingClientRect().height*scale;
 const height=Math.round(Math.max(api.profile()==='phone'?36:44,Math.min(saved,b.h*scale-chrome)));
 out.dataset.manualHeight='true';if(Math.abs(parseFloat(out.style.height)-height)>.5)out.style.height=height+'px';return true;
}
function setHeight(n){try{localStorage.setItem(heightKey(),String(Math.round(Math.max(api.profile()==='phone'?36:44,Math.min(1200,n)))));}catch(e){}apply();}
function setWidth(n){const max=Math.min(api.profile()==='phone'?640:1200,Number(widthSlider.max));const width=Math.round(Math.max(240,Math.min(max,n)));try{localStorage.setItem(`esakits.ipa.panel-width.${api.profile()}.v1`,String(width));}catch(e){}widthSlider.value=String(width);panel.style.width=width+'px';panel.classList.toggle('input-panel-compact',width<316);}
window.esaEditorGeometry={apply,get active(){return !!active;}};
function begin(e,axis){
 if(e.button!==0||active)return;e.preventDefault();e.stopPropagation();
 const b=api.bounds(),r=panel.getBoundingClientRect();active={id:e.pointerId,axis,x:e.clientX,y:e.clientY,left:r.left,top:r.top,panelHeight:r.height,width:r.width*b.scale,height:out.getBoundingClientRect().height*b.scale,scale:b.scale};e.currentTarget.setPointerCapture(e.pointerId);document.body.classList.add('editor-resizing');
}
function moving(e){if(!active||active.id!==e.pointerId)return;e.preventDefault();const a=active,dx=(e.clientX-a.x)*a.scale,dy=(e.clientY-a.y)*a.scale;if(/[ew]/.test(a.axis))setWidth(a.width+(a.axis.includes('w')?-dx:dx));if(/[ns]/.test(a.axis))setHeight(a.height+(a.axis.includes('n')?-dy:dy));const r=panel.getBoundingClientRect();api.move(a.left+(a.axis.includes('w')?a.width/a.scale-r.width:0),a.top+(a.axis.includes('n')?a.panelHeight-r.height:0));}
function end(e){if(!active||active.id!==e.pointerId)return;const r=panel.getBoundingClientRect();active=null;document.body.classList.remove('editor-resizing');api.move(r.left,r.top,true);api.place();}
function autoHeight(){try{localStorage.removeItem(heightKey());}catch(e){}delete out.dataset.manualHeight;out.style.height='auto';const phone=api.profile()==='phone';out.style.height=Math.min(phone?120:420,Math.max(phone?36:44,out.scrollHeight+2))+'px';window.dispatchEvent(new Event('esa-panel-layout'));}
for(const h of[...handles,divider]){
 const axis=h.dataset.axis||'s';h.addEventListener('pointerdown',e=>begin(e,axis));h.addEventListener('pointermove',moving);for(const type of['pointerup','pointercancel','lostpointercapture'])h.addEventListener(type,end);
 h.addEventListener('keydown',e=>{if(e.key==='Home'){e.preventDefault();autoHeight();return;}const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-1,ArrowDown:1}[e.key];if(!delta)return;e.preventDefault();const step=delta*(e.shiftKey?40:10),r=panel.getBoundingClientRect(),scale=api.bounds().scale;if(/[ew]/.test(axis)&&/Left|Right/.test(e.key))setWidth(r.width*scale+step);if(/[ns]/.test(axis)&&/Up|Down/.test(e.key))setHeight(out.getBoundingClientRect().height*scale+step);api.move(r.left,r.top,true);api.place();});
}
divider.addEventListener('dblclick',autoHeight);
const distance=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
out.addEventListener('touchstart',e=>{if(e.touches.length!==2)return;if(e.cancelable)e.preventDefault();e.stopPropagation();pinch={distance:Math.max(1,distance(e.touches)),size:parseFloat(getComputedStyle(out).fontSize)};},{passive:false});
out.addEventListener('touchmove',e=>{if(!pinch)return;if(e.cancelable)e.preventDefault();e.stopPropagation();if(e.touches.length===2)window.esaSetInputPixels(pinch.size*distance(e.touches)/pinch.distance);},{passive:false});
function endPinch(e){if(!pinch)return;if(e.cancelable)e.preventDefault();e.stopPropagation();if(e.touches.length<2)pinch=null;}
out.addEventListener('touchend',endPinch,{passive:false});out.addEventListener('touchcancel',endPinch,{passive:false});
out.addEventListener('wheel',e=>{if(!e.ctrlKey)return;e.preventDefault();e.stopPropagation();window.esaSetInputPixels(parseFloat(getComputedStyle(out).fontSize)*Math.exp(-e.deltaY*.01));},{passive:false});
out.addEventListener('gesturestart',e=>{e.preventDefault();gesture=parseFloat(getComputedStyle(out).fontSize);},{passive:false});
out.addEventListener('gesturechange',e=>{e.preventDefault();if(gesture&&!pinch)window.esaSetInputPixels(gesture*e.scale);},{passive:false});out.addEventListener('gestureend',e=>{e.preventDefault();gesture=null;},{passive:false});
function labels(){const lang=document.getElementById('languageSelect').value,t=k=>window.esaI18n.t(k,lang,'panel');for(const h of handles){h.title=t('パネルのサイズを変更');h.setAttribute('aria-label',h.title);}divider.title=t('入力領域の高さを変更');divider.setAttribute('aria-label',divider.title);}
let queued=0;function refresh(){if(queued||active)return;queued=requestAnimationFrame(()=>{queued=0;if(savedHeight()!==null)apply();else{delete out.dataset.manualHeight;}api.place();});}
new ResizeObserver(refresh).observe(panel);window.addEventListener('resize',refresh);window.visualViewport?.addEventListener('resize',refresh);window.addEventListener('esa-panel-layout',refresh);document.getElementById('languageSelect').addEventListener('change',labels);window.esaI18n.ready.then(labels);labels();apply();api.place();
})();
