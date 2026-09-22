
(function(){
var C=10,R=12,nextPart=1,nextWire=1,SOURCE_PLUS='10:L',SOURCE_MINUS='11:L';
var defs={
 resistor:{n:'저항',s:'R',w:1,h:3,d:'전압 조절용',polar:false},
 cap:{n:'캐패시터',s:'CAP',w:1,h:2,d:'순간전력 저장',polar:true},
 battery:{n:'버퍼 배터리',s:'BAT',w:2,h:3,d:'12V 저장 · +0.8A',polar:true},
 gun:{n:'기관포',s:'GUN',w:2,h:2,d:'0.8A · 10 DPS',polar:true},
 pulse:{n:'펄스포',s:'PULSE',w:3,h:2,d:'CAP 필요 · 1.2A',polar:true},
 repair:{n:'수리기',s:'FIX',w:2,h:2,d:'0.7A · 회복',polar:true}
};
var st={mode:'edit',wireStart:null,parts:[],wires:[],credits:100,stage:1,busy:false,trayOpen:true,inv:{resistor:3,cap:2,battery:1,gun:2,pulse:1,repair:1},drag:null,preview:null,selected:null};

function q(s){return document.querySelector(s)}
function nodeOf(x,y){return y+':'+(x<5?'L':'R')}
function dims(t,r){var d=defs[t];return r?{w:d.h,h:d.w}:{w:d.w,h:d.h}}
function hit(p,x,y){var d=dims(p.t,p.r);return x>=p.x&&x<p.x+d.w&&y>=p.y&&y<p.y+d.h}
function terminals(p){
 var d=dims(p.t,p.r),a={x:p.x,y:p.y},b={x:p.x+d.w-1,y:p.y+d.h-1};
 return [{x:a.x,y:a.y,role:defs[p.t].polar?'plus':'passive'},{x:b.x,y:b.y,role:defs[p.t].polar?'minus':'passive'}]
}
function canPlace(t,x,y,r,ignoreId){
 var d=dims(t,r);if(x<0||y<0||x+d.w>C||y+d.h>R)return false;
 for(var i=0;i<st.parts.length;i++){var p=st.parts[i];if(p.id===ignoreId)continue;for(var yy=y;yy<y+d.h;yy++)for(var xx=x;xx<x+d.w;xx++)if(hit(p,xx,yy))return false}
 return true
}
function add(t,x,y,r){
 if(!st.inv[t]||!canPlace(t,x,y,r,null))return null;
 st.inv[t]--;var p={id:nextPart++,t:t,x:x,y:y,r:r||0};st.parts.push(p);return p
}
function partNodes(p){
 var t=terminals(p);
 return{plus:nodeOf(t[0].x,t[0].y),minus:nodeOf(t[1].x,t[1].y)}
}
function clamp01(v,lo,hi){return Math.max(lo,Math.min(hi,v))}
function buildNetMap(){
 var parent={};
 function add(n){n=String(n);if(parent[n]==null)parent[n]=n;return n}
 function find(n){n=add(n);var r=n;while(parent[r]!==r)r=parent[r];while(parent[n]!==n){var p=parent[n];parent[n]=r;n=p}return r}
 function union(a,b){a=find(a);b=find(b);if(a!==b)parent[b]=a}
 for(var y=0;y<R;y++){add(y+':L');add(y+':R')}
 add(SOURCE_PLUS);add(SOURCE_MINUS);
 st.parts.forEach(function(p){var n=partNodes(p);add(n.plus);add(n.minus)});
 st.wires.forEach(function(w){union(nodeOf(w.a.x,w.a.y),nodeOf(w.b.x,w.b.y))});
 Object.keys(parent).forEach(find);
 return{find:find,parent:parent}
}
function pairKey(a,b){return a<b?a+'|'+b:b+'|'+a}
function calc(){
 var API=window.BreadboardCircuitEngine;
 if(!API||!API.CircuitEngine)return{pos:{},neg:{},s:2.5,n:0,d:0,h:0,w:['회로 엔진을 불러오지 못했습니다'],cap:0,short:false,parts:{}};

 var net=buildNetMap(),ground=net.find(SOURCE_MINUS),plus=net.find(SOURCE_PLUS);
 var eng=new API.CircuitEngine({ground:ground,gmin:1e-10});
 eng.addSource('core',plus,ground,{voltage:12,internalResistance:.02,currentLimit:2.5,allowSink:false});

 st.parts.forEach(function(p){
   var n=partNodes(p),a=net.find(n.plus),b=net.find(n.minus),id='part-'+p.id;
   if(p.t==='resistor')eng.addResistor(id,a,b,6,{partId:p.id});
   else if(p.t==='cap')eng.addCapacitor(id,a,b,.25,{initialVoltage:0,maxVoltage:16,meta:{partId:p.id}});
   else if(p.t==='battery')eng.addBattery(id,a,b,{voltage:12,internalResistance:.12,currentLimit:.8,sinkLimit:.5,capacityJ:240,soc:1,meta:{partId:p.id}});
   else if(p.t==='gun')eng.addLoad(id,a,b,{ratedVoltage:12,ratedCurrent:.8,minVoltage:7,meta:{partId:p.id}});
   else if(p.t==='repair')eng.addLoad(id,a,b,{ratedVoltage:12,ratedCurrent:.7,minVoltage:7,meta:{partId:p.id}});
   else if(p.t==='pulse')eng.addPulseLoad(id,a,b,{ratedVoltage:12,pulseCurrent:8,minVoltage:7,active:false,meta:{partId:p.id}})
 });

 var result=eng.solveDC(),capPairs={},parts={},warn=[],dps=0,heal=0,need=0,batteries=0;
 st.parts.forEach(function(p){
   if(p.t!=='cap')return;
   var n=partNodes(p),a=net.find(n.plus),b=net.find(n.minus),br=result.branches['part-'+p.id];
   if(br&&br.voltage>1)capPairs[pairKey(a,b)]=1
 });

 st.parts.forEach(function(p){
   var n=partNodes(p),a=net.find(n.plus),b=net.find(n.minus),br=result.branches['part-'+p.id]||{voltage:0,current:0,power:0,status:'off'};
   var v=br.voltage||0,i=br.current||0,same=a===b,reversed=!!defs[p.t].polar&&v<-.5,sharedCap=false,live=false;
   if(p.t==='pulse')sharedCap=!!capPairs[pairKey(a,b)];

   if(p.t==='gun'){
     if(v>3){var scale=clamp01(v/12,0,1.25);dps+=10*scale;need+=Math.max(0,i);live=v>=7}
   } else if(p.t==='repair'){
     if(v>3){var hs=clamp01(v/12,0,1.25);heal+=3*hs;need+=Math.max(0,i);live=v>=7}
   } else if(p.t==='pulse'){
     if(v>=7&&sharedCap){dps+=18*clamp01(v/12,0,1.2);live=true}
   } else if(p.t==='cap'){
     live=Math.abs(v)>.5
   } else if(p.t==='battery'){
     batteries++;live=Math.abs(v)>5
   } else if(p.t==='resistor'){
     live=Math.abs(i)>.001
   }

   if(same)warn.push(defs[p.t].n+' 양단이 같은 노드입니다');
   else if(reversed)warn.push(defs[p.t].n+' 극성이 반대입니다');
   else if((p.t==='gun'||p.t==='repair')&&v>1&&v<7)warn.push(defs[p.t].n+' 저전압 '+v.toFixed(1)+'V');
   else if(p.t==='pulse'&&v>=7&&!sharedCap)warn.push('펄스포와 같은 버스에 사용 가능한 CAP이 없습니다');

   parts[p.id]={branch:br,voltage:v,current:i,same:same,reversed:reversed,sharedCap:sharedCap,live:live,a:a,b:b}
 });

 (result.warnings||[]).forEach(function(w){if(w.type==='source-short')warn.unshift('CORE +12V와 GND가 직접 단락되었습니다')});
 var core=result.branches.core||{status:'off',current:0};
 if(core.status==='cc+')warn.push('CORE가 '+core.current.toFixed(1)+'A 전류 제한 상태입니다');

 var pos={},neg={},short=plus===ground;
 for(var y=0;y<R;y++)['L','R'].forEach(function(side){
   var raw=y+':'+side,root=net.find(raw),v=result.voltages[root]||0;
   neg[raw]=root===ground;
   pos[raw]=short&&root===ground?true:v>.35
 });

 return{
   pos:pos,neg:neg,s:2.5+batteries*.8,n:need,d:dps,h:heal,w:warn,cap:Object.keys(capPairs).length,
   short:short,parts:parts,engine:eng,result:result,net:net,core:core
 }
}

function partStatus(p,ev){
 var pr=ev.parts&&ev.parts[p.id];
 if(!pr)return{text:'OFF',cls:'state-off'};
 if(pr.same)return{text:'ERR',cls:'state-bad'};
 if(pr.reversed)return{text:'REV',cls:'state-bad'};
 var v=pr.voltage||0,i=pr.current||0;

 if(p.t==='resistor'){
   return Math.abs(i)>.001?{text:'I '+Math.abs(i).toFixed(1)+'A',cls:'state-on'}:{text:'OFF',cls:'state-off'}
 }
 if(p.t==='cap'){
   if(Math.abs(v)<.5)return{text:'OFF',cls:'state-off'};
   return{text:'BUS '+Math.abs(v).toFixed(1)+'V',cls:'state-on'}
 }
 if(p.t==='battery'){
   if(i>.05)return{text:'OUT '+i.toFixed(1)+'A',cls:'state-on'};
   if(i<-.05)return{text:'CHG '+Math.abs(i).toFixed(1)+'A',cls:'state-partial'};
   return Math.abs(v)>5?{text:'BUF',cls:'state-on'}:{text:'OFF',cls:'state-off'}
 }
 if(p.t==='pulse'){
   if(v<1)return{text:'OFF',cls:'state-off'};
   if(v<7)return{text:'LOW '+v.toFixed(1)+'V',cls:'state-warn'};
   if(!pr.sharedCap)return{text:'CAP?',cls:'state-warn'};
   return{text:'READY '+v.toFixed(1)+'V',cls:'state-on'}
 }
 if(v<1)return{text:'OFF',cls:'state-off'};
 if(v<7)return{text:'LOW '+v.toFixed(1)+'V',cls:'state-warn'};
 if(v>13.8)return{text:'OVER '+v.toFixed(1)+'V',cls:'state-bad'};
 return{text:'ON '+v.toFixed(1)+'V',cls:'state-on'}
}

function voltageColor(v){
 v=+v||0;
 if(v<0){
   var m=Math.min(1,Math.abs(v)/12);
   return 'hsl('+(270+30*m)+',78%,'+(48+5*m)+'%)';
 }
 var t=Math.max(0,Math.min(1,v/12));
 var hue=220*(1-t);
 if(v>12){
   var over=Math.min(1,(v-12)/6);
   hue=360-35*over;
 }
 return 'hsl('+hue+',78%,52%)'
}
function voltageText(v){
 if(Math.abs(v)<0.05)return '0.0V';
 return v.toFixed(1)+'V'
}

function makeBoard(){
 var sl=q('#stripLayer'),grid=q('#grid');
 for(var y=0;y<R;y++)['L','R'].forEach(function(side){var line=document.createElement('div');line.className='strip-line';if(y===10&&side==='L')line.classList.add('core-plus');if(y===11&&side==='L')line.classList.add('core-minus');line.style.top=((y+.5)*100/R)+'%';line.style.left=side==='L'?'4.8%':'54.8%';line.style.width='40.4%';sl.appendChild(line)});
 for(var i=0;i<C*R;i++){var c=document.createElement('div'),x=i%C,y=Math.floor(i/C);c.className='cell';c.dataset.x=x;c.dataset.y=y;if(y===10&&x<5)c.classList.add('core-plus');if(y===11&&x<5)c.classList.add('core-minus');c.addEventListener('click',tapHole);grid.appendChild(c)}
}
function tapHole(e){
 if(st.busy||st.drag)return;var x=+e.currentTarget.dataset.x,y=+e.currentTarget.dataset.y;
 if(st.mode!=='wire')return;
 if(!st.wireStart){st.wireStart={x:x,y:y};st.selected=null;q('#hint').innerHTML='<b>점퍼선 시작점.</b> 끝 홀을 탭하세요.'}
 else{
   var a=st.wireStart,b={x:x,y:y};if(nodeOf(a.x,a.y)===nodeOf(b.x,b.y))q('#hint').innerHTML='<b>같은 5홀 노드.</b> 점퍼선이 필요 없습니다.';
   else{var w={id:nextWire++,a:a,b:b};st.wires.push(w);st.selected={kind:'wire',id:w.id};q('#hint').textContent='점퍼선 생성 완료.'}
   st.wireStart=null;st.mode='edit'
 }
 draw()
}
function wireCenter(h){return{x:(h.x+.5)*100,y:(h.y+.5)*100}}
function gridFromClient(cx,cy){
 var rect=q('#board').getBoundingClientRect(),cw=rect.width/C,ch=rect.height/R;
 return{x:Math.max(0,Math.min(C-1,Math.round((cx-rect.left)/cw-.5))),y:Math.max(0,Math.min(R-1,Math.round((cy-rect.top)/ch-.5)))}
}
function setWireVisual(vis,a,b){
 var A=wireCenter(a),B=wireCenter(b),d='M '+A.x+' '+A.y+' L '+B.x+' '+B.y;
 vis.v.setAttribute('d',d);vis.hit.setAttribute('d',d);
 vis.dotA.setAttribute('cx',A.x);vis.dotA.setAttribute('cy',A.y);
 vis.dotB.setAttribute('cx',B.x);vis.dotB.setAttribute('cy',B.y);
 if(vis.hA){vis.hA.setAttribute('cx',A.x);vis.hA.setAttribute('cy',A.y)}
 if(vis.hB){vis.hB.setAttribute('cx',B.x);vis.hB.setAttribute('cy',B.y)}
}
function drawWires(ev){
 var wl=q('#wireLayer');wl.innerHTML='';
 st.wires.forEach(function(w){
   var A=wireCenter(w.a),B=wireCenter(w.b),sel=st.selected&&st.selected.kind==='wire'&&st.selected.id===w.id;var na=nodeOf(w.a.x,w.a.y),nb=nodeOf(w.b.x,w.b.y),wp=!!ev.pos[na]&&!!ev.pos[nb],wg=!!ev.neg[na]&&!!ev.neg[nb],netCls=wp&&wg?' net-both':wp?' net-plus':wg?' net-minus':'';
   var v=document.createElementNS('http://www.w3.org/2000/svg','path');v.setAttribute('class','wire'+netCls+(sel?' selected':''));v.setAttribute('d','M '+A.x+' '+A.y+' L '+B.x+' '+B.y);wl.appendChild(v);
   var hit=document.createElementNS('http://www.w3.org/2000/svg','path');hit.setAttribute('class','wire-hit');hit.setAttribute('d','M '+A.x+' '+A.y+' L '+B.x+' '+B.y);wl.appendChild(hit);
   var dotA=document.createElementNS('http://www.w3.org/2000/svg','circle');dotA.setAttribute('class','wire-dot'+(sel?' selected':''));dotA.setAttribute('cx',A.x);dotA.setAttribute('cy',A.y);dotA.setAttribute('r','12');wl.appendChild(dotA);
   var dotB=document.createElementNS('http://www.w3.org/2000/svg','circle');dotB.setAttribute('class','wire-dot'+(sel?' selected':''));dotB.setAttribute('cx',B.x);dotB.setAttribute('cy',B.y);dotB.setAttribute('r','12');wl.appendChild(dotB);
   var hA=null,hB=null;
   if(sel){
     hA=document.createElementNS('http://www.w3.org/2000/svg','circle');hA.setAttribute('class','wire-handle');hA.setAttribute('cx',A.x);hA.setAttribute('cy',A.y);hA.setAttribute('r','23');wl.appendChild(hA);
     hB=document.createElementNS('http://www.w3.org/2000/svg','circle');hB.setAttribute('class','wire-handle');hB.setAttribute('cx',B.x);hB.setAttribute('cy',B.y);hB.setAttribute('r','23');wl.appendChild(hB);
   }
   var vis={v:v,hit:hit,dotA:dotA,dotB:dotB,hA:hA,hB:hB};
   bindWireDrag(hit,w,vis);
   if(sel){bindWireEndDrag(hA,w,'a',vis);bindWireEndDrag(hB,w,'b',vis)}
 })
}
function bindWireDrag(el,w,vis){
 var start=null,orig=null,pid=null,moved=false,last=null;
 el.addEventListener('pointerdown',function(e){
   e.stopPropagation();st.selected={kind:'wire',id:w.id};
   if(st.trayOpen){draw();return}
   pid=e.pointerId;start={x:e.clientX,y:e.clientY};orig={a:{x:w.a.x,y:w.a.y},b:{x:w.b.x,y:w.b.y}};last=orig;moved=false;el.setPointerCapture(pid)
 });
 el.addEventListener('pointermove',function(e){
   if(pid!==e.pointerId||!start)return;
   var rect=q('#board').getBoundingClientRect(),dx=Math.round((e.clientX-start.x)/(rect.width/C)),dy=Math.round((e.clientY-start.y)/(rect.height/R));
   if(dx||dy)moved=true;
   var na={x:orig.a.x+dx,y:orig.a.y+dy},nb={x:orig.b.x+dx,y:orig.b.y+dy};
   if(na.x<0||na.x>=C||nb.x<0||nb.x>=C||na.y<0||na.y>=R||nb.y<0||nb.y>=R)return;
   last={a:na,b:nb};setWireVisual(vis,na,nb)
 });
 el.addEventListener('pointerup',function(e){
   if(pid!==e.pointerId)return;
   if(moved&&last){w.a=last.a;w.b=last.b}
   start=null;pid=null;st.selected={kind:'wire',id:w.id};q('#hint').textContent=moved?'점퍼선 이동 완료.':'점퍼선 선택됨.';draw()
 });
 el.addEventListener('pointercancel',function(){start=null;pid=null;draw()})
}
function bindWireEndDrag(el,w,key,vis){
 var pid=null,last=null;
 el.addEventListener('pointerdown',function(e){e.stopPropagation();pid=e.pointerId;last={x:w[key].x,y:w[key].y};el.setPointerCapture(pid)});
 el.addEventListener('pointermove',function(e){
   if(pid!==e.pointerId)return;last=gridFromClient(e.clientX,e.clientY);
   var a=key==='a'?last:w.a,b=key==='b'?last:w.b;setWireVisual(vis,a,b)
 });
 el.addEventListener('pointerup',function(e){
   if(pid!==e.pointerId)return;if(last)w[key]=last;pid=null;st.selected={kind:'wire',id:w.id};q('#hint').textContent='점퍼선 끝점 이동 완료.';draw()
 });
 el.addEventListener('pointercancel',function(){pid=null;draw()})
}

function drawParts(ev){
 var pl=q('#parts');pl.innerHTML='';
 st.parts.forEach(function(p){
   var d=dims(p.t,p.r),sel=st.selected&&st.selected.kind==='part'&&st.selected.id===p.id;
   var b=document.createElement('div');b.className='part '+p.t+(sel?' selected':'');
   var ps=partStatus(p,ev);if(ps.cls==='state-on')b.classList.add('powered');if(ps.cls==='state-bad')b.classList.add('bad');
   b.style.left=(p.x*10)+'%';b.style.top=(p.y*100/R)+'%';b.style.width=(d.w*10)+'%';b.style.height=(d.h*100/R)+'%';
   b.innerHTML=defs[p.t].s+'<small>'+defs[p.t].n+'</small>';
   var badge=document.createElement('span');badge.className='part-state '+ps.cls;badge.textContent=ps.text;b.appendChild(badge);
   terminals(p).forEach(function(t){var dot=document.createElement('i');dot.className='pin '+t.role;dot.style.left=((t.x-p.x+.5)/d.w*100)+'%';dot.style.top=((t.y-p.y+.5)/d.h*100)+'%';b.appendChild(dot)});
   bindPlacedPart(b,p);pl.appendChild(b)
 })
}
function bindPlacedPart(el,p){
 var pid=null,start=null,moved=false;
 el.addEventListener('pointerdown',function(e){e.stopPropagation();st.selected={kind:'part',id:p.id};if(st.trayOpen||st.busy){draw();return}pid=e.pointerId;start={x:e.clientX,y:e.clientY};moved=false;el.setPointerCapture(pid);st.drag={source:'board',partId:p.id,t:p.t,r:p.r};updateBoardPartDrag(e.clientX,e.clientY,p)});
 el.addEventListener('pointermove',function(e){if(pid!==e.pointerId||!start)return;if(Math.hypot(e.clientX-start.x,e.clientY-start.y)>4)moved=true;updateBoardPartDrag(e.clientX,e.clientY,p)});
 el.addEventListener('pointerup',function(e){if(pid!==e.pointerId)return;var pv=st.preview;if(moved&&pv&&pv.valid){p.x=pv.x;p.y=pv.y;st.selected={kind:'part',id:p.id};q('#hint').textContent='부품 이동 완료.'}else if(!moved)q('#hint').textContent='부품 선택됨. ↻ / ✕ 버튼으로 편집하세요.';finishDrag();pid=null;start=null;draw()});
 el.addEventListener('pointercancel',function(){finishDrag();pid=null;start=null;draw()})
}
function updateBoardPartDrag(cx,cy,p){
 var rect=q('#board').getBoundingClientRect(),d=dims(p.t,p.r),cw=rect.width/C,ch=rect.height/R,x=Math.round((cx-rect.left)/cw-d.w/2),y=Math.round((cy-rect.top)/ch-d.h/2);
 x=Math.max(0,Math.min(C-d.w,x));y=Math.max(0,Math.min(R-d.h,y));var valid=canPlace(p.t,x,y,p.r,p.id);st.preview={x:x,y:y,valid:valid};showPreview(p.t,p.r,x,y,valid)
}

function drawGrid(ev){
 var labels=q('#nodeLabelLayer');labels.innerHTML='';
 var shown={};

 document.querySelectorAll('.cell').forEach(function(c){
   c.classList.remove('same-node','wire-start','net-plus','net-minus','net-both','voltage-live');
   c.style.background='';
   var x=+c.dataset.x,y=+c.dataset.y,raw=nodeOf(x,y);
   var root=ev.net&&ev.net.find?ev.net.find(raw):raw;
   var v=ev.result&&ev.result.voltages?+(ev.result.voltages[root]||0):0;

   c.classList.add('voltage-live');
   c.style.background=voltageColor(v)+'22';
   c.style.setProperty('--node-color',voltageColor(v));
   c.style.boxShadow='inset 0 0 0 1px '+voltageColor(v)+'33';

   if(!shown[raw]){
     shown[raw]=1;
     var lab=document.createElement('span');
     lab.className='node-voltage '+(x<5?'left':'right');
     lab.style.top=((y+.5)*100/R)+'%';
     lab.style.borderColor=voltageColor(v);
     lab.textContent=voltageText(v);
     labels.appendChild(lab)
   }

   if(st.wireStart){
     if(raw===nodeOf(st.wireStart.x,st.wireStart.y))c.classList.add('same-node');
     if(x===st.wireStart.x&&y===st.wireStart.y)c.classList.add('wire-start')
   }
 });

 // Hole color follows the electrical node voltage.
 document.querySelectorAll('.cell').forEach(function(c){
   var x=+c.dataset.x,y=+c.dataset.y,raw=nodeOf(x,y);
   var root=ev.net&&ev.net.find?ev.net.find(raw):raw;
   var v=ev.result&&ev.result.voltages?+(ev.result.voltages[root]||0):0;
   c.style.setProperty('--hole-voltage-color',voltageColor(v));
 })
}

function miniShape(t){var d=defs[t],scale=Math.min(27/d.w,27/d.h);return '<div class="mini-shape" data-part="'+t+'"><div class="mini-body '+t+'" style="width:'+Math.max(8,d.w*scale)+'px;height:'+Math.max(8,d.h*scale)+'px"></div></div>'}
function palette(){
 var p=q('#palette');p.innerHTML='';
 Object.keys(defs).forEach(function(t){var d=defs[t],card=document.createElement('div');card.className='piece'+(!st.inv[t]?' disabled':'');card.innerHTML='<div class="piece-top">'+miniShape(t)+'<b>'+d.n+'</b></div><span>'+d.d+'</span><em>보유 ×'+st.inv[t]+' · '+d.w+'×'+d.h+'</em>';var icon=card.querySelector('.mini-shape');if(st.inv[t])bindTrayDrag(icon,t);p.appendChild(card)})
}
function bindTrayDrag(el,t){
 var pid=null;
 el.addEventListener('pointerdown',function(e){e.preventDefault();e.stopPropagation();pid=e.pointerId;el.setPointerCapture(pid);st.drag={source:'tray',t:t,r:0};st.preview=null;q('#dragGhost').textContent=defs[t].n;q('#dragGhost').classList.add('show');q('#trayShell').classList.add('auto-hide');updateTrayDrag(e.clientX,e.clientY)});
 el.addEventListener('pointermove',function(e){if(pid!==e.pointerId)return;q('#dragGhost').style.left=e.clientX+'px';q('#dragGhost').style.top=e.clientY+'px';updateTrayDrag(e.clientX,e.clientY)});
 el.addEventListener('pointerup',function(e){if(pid!==e.pointerId)return;var pv=st.preview;if(pv&&pv.valid){var np=add(t,pv.x,pv.y,0);if(np){st.selected={kind:'part',id:np.id};setTray(false);q('#hint').textContent=defs[t].n+' 설치됨.'}}else q('#hint').textContent='설치 취소.';finishDrag();pid=null;draw()});
 el.addEventListener('pointercancel',function(){finishDrag();pid=null;draw()})
}
function updateTrayDrag(cx,cy){
 if(!st.drag)return;var rect=q('#board').getBoundingClientRect(),t=st.drag.t,d=dims(t,st.drag.r),inside=cx>=rect.left&&cx<=rect.right&&cy>=rect.top&&cy<=rect.bottom;
 if(!inside){st.preview=null;q('#dropPreview').classList.remove('show','invalid');return}
 var cw=rect.width/C,ch=rect.height/R,x=Math.round((cx-rect.left)/cw-d.w/2),y=Math.round((cy-rect.top)/ch-d.h/2);x=Math.max(0,Math.min(C-d.w,x));y=Math.max(0,Math.min(R-d.h,y));var valid=canPlace(t,x,y,st.drag.r,null);st.preview={x:x,y:y,valid:valid};showPreview(t,st.drag.r,x,y,valid)
}
function showPreview(t,r,x,y,valid){var d=dims(t,r),pv=q('#dropPreview');pv.classList.add('show');pv.classList.toggle('invalid',!valid);pv.style.left=(x*10)+'%';pv.style.top=(y*100/R)+'%';pv.style.width=(d.w*10)+'%';pv.style.height=(d.h*100/R)+'%';pv.innerHTML='<span>'+defs[t].s+'</span>'}
function finishDrag(){q('#dragGhost').classList.remove('show');q('#dropPreview').classList.remove('show','invalid');q('#trayShell').classList.remove('auto-hide');st.drag=null;st.preview=null}

function setTray(open){st.trayOpen=open;q('#trayShell').classList.toggle('closed',!open);q('#trayToggleText').textContent=open?'부품 트레이 닫기':'부품 트레이 열기';q('#trayArrow').textContent=open?'▼':'▲';if(open)st.selected=null;drawSelectionTools()}
function selectedPart(){return st.selected&&st.selected.kind==='part'?st.parts.find(function(p){return p.id===st.selected.id}):null}
function selectedWire(){return st.selected&&st.selected.kind==='wire'?st.wires.find(function(w){return w.id===st.selected.id}):null}
function drawSelectionTools(){
 var box=q('#selectionTools'),part=selectedPart(),wire=selectedWire();if(!part&&!wire){box.classList.remove('show');return}
 var x,y;
 if(part){var d=dims(part.t,part.r);x=(part.x+d.w/2)*10;y=(part.y)*100/R;q('#selRotate').disabled=false}
 else{var A=wireCenter(wire.a),B=wireCenter(wire.b);x=(A.x+B.x)/20;y=(A.y+B.y)/24;q('#selRotate').disabled=true}
 x=Math.max(10,Math.min(90,x));y=Math.max(10,Math.min(96,y));box.style.left=x+'%';box.style.top=y+'%';box.classList.add('show')
}
function rotateSelected(){
 var p=selectedPart();if(!p)return;var nr=p.r?0:1;if(canPlace(p.t,p.x,p.y,nr,p.id)){p.r=nr;q('#hint').textContent='부품을 90° 회전했습니다.'}else q('#hint').textContent='회전할 공간이 부족합니다.';draw()
}
function deleteSelected(){
 var p=selectedPart(),w=selectedWire();
 if(p){st.inv[p.t]++;st.parts=st.parts.filter(function(x){return x.id!==p.id})}
 if(w)st.wires=st.wires.filter(function(x){return x.id!==w.id});
 st.selected=null;q('#hint').textContent='삭제했습니다.';draw()
}

function draw(){
 var ev=calc();drawParts(ev);drawWires(ev);drawGrid(ev);palette();drawSelectionTools();q('#wire').classList.toggle('on',st.mode==='wire');
 q('#amps').textContent=ev.n.toFixed(1)+'/'+ev.s.toFixed(1)+'A';q('#dps').textContent=ev.d.toFixed(0);q('#heal').textContent=ev.h.toFixed(1);
 var used=0;st.parts.forEach(function(p){var d=dims(p.t,p.r);used+=d.w*d.h});q('#space').textContent=Math.round(used/C/R*100)+'%';q('#fight').disabled=st.busy||ev.d<=0||ev.short
}
function clearBoard(){st.parts.forEach(function(p){st.inv[p.t]++});st.parts=[];st.wires=[];st.wireStart=null;st.selected=null}

q('#trayToggle').onclick=function(){setTray(!st.trayOpen)};
q('#wire').onclick=function(){st.mode=st.mode==='wire'?'edit':'wire';st.wireStart=null;st.selected=null;if(st.mode==='wire')setTray(false);q('#hint').innerHTML=st.mode==='wire'?'<b>점퍼선.</b> 시작 홀과 끝 홀을 차례로 탭하세요.':'점퍼선 모드 종료.';draw()};
q('#reset').onclick=function(){clearBoard();st.mode='edit';draw();q('#hint').textContent='빵판을 초기화했습니다.'};
q('#selRotate').onclick=function(e){e.stopPropagation();rotateSelected()};
q('#selDelete').onclick=function(e){e.stopPropagation();deleteSelected()};

q('#reco').onclick=function(){
 clearBoard();
 var need={gun:1,cap:1,pulse:1,repair:1,battery:1};for(var k in need)if(st.inv[k]<need[k])return;
 var bat=add('battery',0,3,0),gun=add('gun',2,6,0),cap=add('cap',5,3,0),pulse=add('pulse',6,6,0),fix=add('repair',6,0,0);
 function W(ax,ay,bx,by){st.wires.push({id:nextWire++,a:{x:ax,y:ay},b:{x:bx,y:by}})}
 /* + rail to distinct + nodes */
 W(0,10,0,3); W(0,10,2,6); W(0,10,5,3); W(0,10,6,6); W(0,10,6,0);
 /* GND rail to distinct - nodes */
 W(0,11,1,5); W(0,11,3,7); W(0,11,5,4); W(0,11,8,7); W(0,11,7,1);
 st.mode='edit';st.selected=null;setTray(false);q('#hint').innerHTML='<b>추천 회로.</b> +12V와 GND를 서로 다른 노드로 분리한 정상 예시입니다.';draw()
};

q('#check').onclick=function(){var e=calc();q('#hint').innerHTML=e.w.length?'<b>경고:</b> '+e.w[0]:'<b>정상.</b> '+e.d.toFixed(0)+' DPS · 회복 '+e.h.toFixed(1)+'/s · CAP '+e.cap+'개'};
q('#fight').onclick=function(){
 var ev=calc();if(st.busy||ev.d<=0||ev.short)return;st.busy=true;setTray(false);st.selected=null;draw();
 var ph=100,eh=180+(st.stage-1)*45,max=eh,t=0,timer=setInterval(function(){var x=calc();eh-=(x.d-1.2)*.1;ph-=(7+(st.stage-1))*.1;ph+=x.h*.1;ph=Math.min(100,ph);t+=.1;q('#pbar').style.width=Math.max(0,ph)+'%';q('#ebar').style.width=Math.max(0,eh/max*100)+'%';q('#php').textContent=Math.max(0,Math.ceil(ph));q('#ehp').textContent=Math.max(0,Math.ceil(eh));if(eh<=0||ph<=0||t>35){clearInterval(timer);st.busy=false;if(eh<=0){st.credits+=60;q('#credits').textContent=st.credits;q('#modal').classList.add('show');shop()}else q('#hint').innerHTML='<b>패배.</b> 회로를 다시 구성해보세요.';draw()}},100)
};
function shop(){var box=q('#shop'),o=[['cap','CAP +1',35],['battery','배터리 +1',45],['pulse','펄스포 +1',70]];box.innerHTML='';o.forEach(function(a){var b=document.createElement('button');b.className='offer';b.disabled=st.credits<a[2];b.innerHTML='<b>'+a[1]+'</b><span>다음 빌드 선택지 확장</span><em>'+a[2]+' CR</em>';b.onclick=function(){if(st.credits<a[2])return;st.credits-=a[2];st.inv[a[0]]++;q('#credits').textContent=st.credits;b.disabled=true;b.innerHTML+='<span>구매 완료</span>';palette()};box.appendChild(b)})}
q('#next').onclick=function(){st.stage++;q('#stage').textContent=st.stage;q('#ehp').textContent=180+(st.stage-1)*45;q('#php').textContent=100;q('#pbar').style.width='100%';q('#ebar').style.width='100%';q('#modal').classList.remove('show');q('#hint').innerHTML='<b>Stage '+st.stage+'.</b> 트레이를 열어 부품을 추가하거나, 닫고 기존 배치를 드래그하세요.'};

makeBoard();setTray(true);draw()
})();
