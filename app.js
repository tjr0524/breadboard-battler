
(function(){
  var C=10,R=12,nextId=1;
  var SOURCE_PLUS='10:L',SOURCE_MINUS='11:L';

  var defs={
    resistor:{n:'저항',s:'R',w:1,h:3,d:'전압 조절용',polar:false},
    cap:{n:'캐패시터',s:'CAP',w:1,h:2,d:'순간전력 저장',polar:true},
    battery:{n:'배터리',s:'BAT',w:2,h:3,d:'저장전원 · +0.8A',polar:true},
    gun:{n:'기관포',s:'GUN',w:2,h:2,d:'0.8A · 10 DPS',polar:true},
    pulse:{n:'펄스포',s:'PULSE',w:3,h:2,d:'CAP 필요 · 1.2A',polar:true},
    repair:{n:'수리기',s:'FIX',w:2,h:2,d:'0.7A · 회복',polar:true}
  };

  var st={
    mode:'place',rot:0,wireStart:null,parts:[],wires:[],credits:100,stage:1,busy:false,trayOpen:true,
    inv:{resistor:3,cap:2,battery:1,gun:2,pulse:1,repair:1},
    drag:null,preview:null
  };

  function q(s){return document.querySelector(s)}
  function nodeOf(x,y){return y+':'+(x<5?'L':'R')}
  function dims(t,r){var d=defs[t];return r?{w:d.h,h:d.w}:{w:d.w,h:d.h}}
  function hit(p,x,y){var d=dims(p.t,p.r);return x>=p.x&&x<p.x+d.w&&y>=p.y&&y<p.y+d.h}

  function terminals(p){
    var d=dims(p.t,p.r);
    var a={x:p.x,y:p.y},b={x:p.x+d.w-1,y:p.y+d.h-1};
    return [{x:a.x,y:a.y,role:defs[p.t].polar?'plus':'passive'},{x:b.x,y:b.y,role:defs[p.t].polar?'minus':'passive'}]
  }

  function canPlace(t,x,y,r){
    var d=dims(t,r);
    if(x<0||y<0||x+d.w>C||y+d.h>R)return false;
    for(var i=0;i<st.parts.length;i++){
      for(var yy=y;yy<y+d.h;yy++)for(var xx=x;xx<x+d.w;xx++)if(hit(st.parts[i],xx,yy))return false
    }
    return true
  }

  function add(t,x,y,r){
    if(!st.inv[t]||!canPlace(t,x,y,r))return false;
    st.inv[t]--;st.parts.push({id:nextId++,t:t,x:x,y:y,r:r});draw();return true
  }

  function edge(g,a,b,tag){
    if(a===b)return;
    (g[a]||(g[a]=[])).push({to:b,tag:tag});
    (g[b]||(g[b]=[])).push({to:a,tag:tag})
  }

  function buildGraph(){
    var g={};
    st.wires.forEach(function(w){edge(g,nodeOf(w.a.x,w.a.y),nodeOf(w.b.x,w.b.y),'wire')});
    st.parts.forEach(function(p){
      if(p.t==='resistor'){
        var t=terminals(p);edge(g,nodeOf(t[0].x,t[0].y),nodeOf(t[1].x,t[1].y),'resistor')
      }
    });
    return g
  }

  function bfs(g,start){
    var seen={},queue=[start];
    while(queue.length){
      var n=queue.shift();if(seen[n])continue;seen[n]=1;
      (g[n]||[]).forEach(function(e){if(!seen[e.to])queue.push(e.to)})
    }
    return seen
  }

  function partNodes(p){
    var t=terminals(p);
    return{plus:nodeOf(t[0].x,t[0].y),minus:nodeOf(t[1].x,t[1].y)}
  }

  function calc(){
    var g=buildGraph(),pos=bfs(g,SOURCE_PLUS),neg=bfs(g,SOURCE_MINUS);
    var supply=2.5,need=0,dps=0,heal=0,warn=[],capReady=0;
    var hardShort=!!pos[SOURCE_MINUS];

    st.parts.forEach(function(p){
      var n=partNodes(p);
      if(n.plus===n.minus)warn.push(defs[p.t].n+'의 두 핀이 같은 빵판 노드에 꽂혀 있습니다');

      if(p.t==='battery'){
        if(pos[n.plus]&&neg[n.minus])supply+=.8;
        else if(pos[n.minus]&&neg[n.plus])warn.push('배터리 극성이 반대로 연결되어 있습니다')
      }

      if(p.t==='cap'){
        if(pos[n.plus]&&neg[n.minus])capReady++;
        else if(pos[n.minus]&&neg[n.plus])warn.push('캐패시터 극성이 반대로 연결되어 있습니다')
      }
    });

    st.parts.forEach(function(p){
      if(p.t==='resistor'||p.t==='cap'||p.t==='battery')return;
      var n=partNodes(p),on=pos[n.plus]&&neg[n.minus],rev=pos[n.minus]&&neg[n.plus];
      if(rev){warn.push(defs[p.t].n+'의 +/−가 반대로 연결되어 있습니다');return}
      if(!on)return;
      if(p.t==='gun'){need+=.8;dps+=10}
      if(p.t==='repair'){need+=.7;heal+=3}
      if(p.t==='pulse'){
        need+=1.2;
        if(capReady>0)dps+=18;
        else warn.push('펄스포는 +/− 전원에 연결된 캐패시터가 필요합니다')
      }
    });

    if(hardShort){warn.unshift('CORE +12V와 GND가 직접 연결되어 있습니다');dps=0;heal=0}
    var f=need?Math.min(1,supply/need):1;
    if(need>supply)warn.push('공급 가능한 전류보다 요구 전류가 큽니다');

    return{g:g,pos:pos,neg:neg,s:supply,n:need,d:dps*f,h:heal*f,w:warn,cap:capReady,short:hardShort}
  }

  function makeBoard(){
    var sl=q('#stripLayer'),grid=q('#grid');
    for(var y=0;y<R;y++){
      ['L','R'].forEach(function(side){
        var line=document.createElement('div');line.className='strip-line';
        if(y===10&&side==='L')line.classList.add('core-plus');
        if(y===11&&side==='L')line.classList.add('core-minus');
        line.style.top=((y+.5)*100/R)+'%';line.style.left=side==='L'?'4.8%':'54.8%';line.style.width='40.4%';sl.appendChild(line)
      })
    }
    for(var i=0;i<C*R;i++){
      var c=document.createElement('div');c.className='cell';c.dataset.x=i%C;c.dataset.y=Math.floor(i/C);
      var x=i%C,y=Math.floor(i/C);
      if(y===10&&x<5)c.classList.add('core-plus');
      if(y===11&&x<5)c.classList.add('core-minus');
      c.addEventListener('click',tapHole);grid.appendChild(c)
    }
  }

  function tapHole(e){
    if(st.busy||st.drag)return;
    var c=e.currentTarget,x=+c.dataset.x,y=+c.dataset.y;
    if(st.mode==='wire'){
      if(!st.wireStart){
        st.wireStart={x:x,y:y};
        q('#hint').innerHTML='<b>같이 빛나는 5홀은 이미 연결됨.</b> 다른 노드의 홀을 탭하세요.';
      }else{
        var a=st.wireStart,b={x:x,y:y};
        if(nodeOf(a.x,a.y)===nodeOf(b.x,b.y)){
          q('#hint').innerHTML='<b>점퍼선 불필요.</b> 이미 같은 내부 노드입니다.';
        }else{
          st.wires.push({a:a,b:b});
          q('#hint').textContent='점퍼선 연결 완료.';
        }
        st.wireStart=null
      }
      draw()
    }
  }

  function wireCenter(h){return{x:(h.x+.5)*100,y:(h.y+.5)*100}}

  function drawWires(){
    var wl=q('#wireLayer');wl.innerHTML='';
    st.wires.forEach(function(w){
      var A=wireCenter(w.a),B=wireCenter(w.b),mid=(A.x+B.x)/2;
      var path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('class','wire');
      path.setAttribute('d','M '+A.x+' '+A.y+' L '+mid+' '+A.y+' L '+mid+' '+B.y+' L '+B.x+' '+B.y);wl.appendChild(path)
    })
  }

  function drawParts(ev){
    var pl=q('#parts');pl.innerHTML='';
    st.parts.forEach(function(p){
      var d=dims(p.t,p.r),nodes=partNodes(p);
      var b=document.createElement('button');b.type='button';b.className='part '+p.t;
      var powered=ev.pos[nodes.plus]&&ev.neg[nodes.minus];
      var reversed=ev.pos[nodes.minus]&&ev.neg[nodes.plus];
      if(powered)b.classList.add('powered');if(reversed||nodes.plus===nodes.minus)b.classList.add('bad');
      b.style.left=(p.x*10)+'%';b.style.top=(p.y*100/R)+'%';b.style.width=(d.w*10)+'%';b.style.height=(d.h*100/R)+'%';
      b.innerHTML=defs[p.t].s+'<small>'+defs[p.t].n+'</small>';

      terminals(p).forEach(function(t){
        var dot=document.createElement('i');dot.className='pin '+t.role;
        dot.style.left=((t.x-p.x+.5)/d.w*100)+'%';dot.style.top=((t.y-p.y+.5)/d.h*100)+'%';b.appendChild(dot)
      });

      b.addEventListener('click',function(e){
        e.stopPropagation();
        if(st.mode==='erase'){
          st.inv[p.t]++;st.parts=st.parts.filter(function(x){return x.id!==p.id});draw()
        }
      });
      pl.appendChild(b)
    })
  }

  function drawGrid(){
    document.querySelectorAll('.cell').forEach(function(c){
      c.classList.remove('same-node','wire-start');
      if(st.wireStart){
        var x=+c.dataset.x,y=+c.dataset.y;
        if(nodeOf(x,y)===nodeOf(st.wireStart.x,st.wireStart.y))c.classList.add('same-node');
        if(x===st.wireStart.x&&y===st.wireStart.y)c.classList.add('wire-start')
      }
    })
  }

  function miniShape(t){
    var d=dims(t,st.rot),scale=Math.min(27/d.w,27/d.h);
    return '<div class="mini-shape"><div class="mini-body '+t+'" style="width:'+Math.max(8,d.w*scale)+'px;height:'+Math.max(8,d.h*scale)+'px"></div></div>'
  }

  function palette(){
    var p=q('#palette');p.innerHTML='';
    Object.keys(defs).forEach(function(t){
      var d=defs[t],b=document.createElement('button');b.type='button';b.className='piece';b.disabled=st.busy||!st.inv[t];
      b.innerHTML='<div class="piece-top">'+miniShape(t)+'<b>'+d.n+'</b></div><span>'+d.d+'</span><em>보유 ×'+st.inv[t]+' · '+dims(t,st.rot).w+'×'+dims(t,st.rot).h+'</em>';
      bindDrag(b,t);p.appendChild(b)
    })
  }

  function bindDrag(el,t){
    var startX=0,startY=0,moved=false,pid=null;

    el.addEventListener('pointerdown',function(e){
      if(el.disabled||st.busy)return;
      pid=e.pointerId;startX=e.clientX;startY=e.clientY;moved=false;
      el.setPointerCapture(pid);
      st.drag={t:t,pointerId:pid};st.preview=null;
      q('#dragGhost').textContent=defs[t].n;
      q('#dragGhost').classList.add('show');
      q('#dragGhost').style.left=e.clientX+'px';q('#dragGhost').style.top=e.clientY+'px';
      q('#trayShell').classList.add('auto-hide');
      q('#hint').innerHTML='<b>'+defs[t].n+'</b> 드래그 중 · 초록 미리보기 위치에 설치됩니다.';
      updateDrag(e.clientX,e.clientY)
    });

    el.addEventListener('pointermove',function(e){
      if(!st.drag||st.drag.pointerId!==e.pointerId)return;
      if(Math.hypot(e.clientX-startX,e.clientY-startY)>5)moved=true;
      q('#dragGhost').style.left=e.clientX+'px';q('#dragGhost').style.top=e.clientY+'px';
      updateDrag(e.clientX,e.clientY)
    });

    function end(e){
      if(!st.drag||st.drag.pointerId!==e.pointerId)return;
      var pv=st.preview,typ=st.drag.t;
      q('#dragGhost').classList.remove('show');
      q('#dropPreview').classList.remove('show','invalid');
      q('#trayShell').classList.remove('auto-hide');
      st.drag=null;st.preview=null;

      if(pv&&pv.valid){
        add(typ,pv.x,pv.y,st.rot);
        setTray(false);
        q('#hint').innerHTML='<b>'+defs[typ].n+'</b> 설치됨. 부품 버튼을 열어 다음 부품을 꺼낼 수 있습니다.';
      }else if(!moved){
        q('#hint').innerHTML='<b>드래그해서 설치하세요.</b> 손가락을 빵판까지 끌고 가면 설치 위치가 표시됩니다.';
      }else{
        q('#hint').textContent='설치 취소.';
      }
      draw()
    }

    el.addEventListener('pointerup',end);
    el.addEventListener('pointercancel',end)
  }

  function updateDrag(clientX,clientY){
    if(!st.drag)return;
    var board=q('#board'),rect=board.getBoundingClientRect(),t=st.drag.t,d=dims(t,st.rot);
    var inside=clientX>=rect.left&&clientX<=rect.right&&clientY>=rect.top&&clientY<=rect.bottom;
    if(!inside){st.preview=null;q('#dropPreview').classList.remove('show','invalid');return}

    var cellW=rect.width/C,cellH=rect.height/R;
    var x=Math.round((clientX-rect.left)/cellW-d.w/2);
    var y=Math.round((clientY-rect.top)/cellH-d.h/2);
    x=Math.max(0,Math.min(C-d.w,x));y=Math.max(0,Math.min(R-d.h,y));
    var valid=canPlace(t,x,y,st.rot);
    st.preview={x:x,y:y,valid:valid};

    var pv=q('#dropPreview');pv.classList.add('show');pv.classList.toggle('invalid',!valid);
    pv.style.left=(x*10)+'%';pv.style.top=(y*100/R)+'%';pv.style.width=(d.w*10)+'%';pv.style.height=(d.h*100/R)+'%';
    pv.innerHTML='<span>'+defs[t].s+'</span>'
  }

  function setTray(open){
    st.trayOpen=open;
    q('#trayShell').classList.toggle('closed',!open);
    q('#trayToggleText').textContent=open?'부품 트레이 닫기':'부품 트레이 열기';
    q('#trayArrow').textContent=open?'▼':'▲'
  }

  function draw(){
    var ev=calc();drawParts(ev);drawWires();drawGrid();palette();
    q('#board').classList.toggle('wiremode',st.mode==='wire');
    q('#wire').classList.toggle('on',st.mode==='wire');q('#erase').classList.toggle('on',st.mode==='erase');q('#rotate').classList.toggle('on',st.rot===1);
    q('#amps').textContent=ev.n.toFixed(1)+'/'+ev.s.toFixed(1)+'A';q('#dps').textContent=ev.d.toFixed(0);q('#heal').textContent=ev.h.toFixed(1);
    var used=0;st.parts.forEach(function(p){var d=dims(p.t,p.r);used+=d.w*d.h});
    q('#space').textContent=Math.round(used/C/R*100)+'%';q('#fight').disabled=st.busy||ev.d<=0||ev.short
  }

  function clearBoard(){
    st.parts.forEach(function(p){st.inv[p.t]++});st.parts=[];st.wires=[];st.wireStart=null
  }

  q('#trayToggle').onclick=function(){setTray(!st.trayOpen)};
  q('#wire').onclick=function(){
    st.mode=st.mode==='wire'?'place':'wire';st.wireStart=null;
    q('#hint').innerHTML=st.mode==='wire'?'<b>점퍼선 모드.</b> 홀 → 홀 순서로 탭하세요.':'점퍼선 모드 종료.';
    draw()
  };
  q('#erase').onclick=function(){
    st.mode=st.mode==='erase'?'place':'erase';st.wireStart=null;
    q('#hint').textContent=st.mode==='erase'?'지울 부품을 탭하세요.':'지우기 종료.';draw()
  };
  q('#rotate').onclick=function(){
    st.rot=st.rot?0:1;
    q('#hint').textContent=st.rot?'트레이 부품 미리보기가 90° 회전됐습니다.':'기본 방향.';
    draw()
  };
  q('#reset').onclick=function(){clearBoard();draw();q('#hint').textContent='빵판을 초기화했습니다.'};

  q('#reco').onclick=function(){
    clearBoard();
    var need={gun:1,cap:1,pulse:1,repair:1,battery:1};for(var k in need)if(st.inv[k]<need[k])return;
    add('battery',0,6,0);add('gun',3,8,0);add('cap',5,8,0);add('pulse',7,7,0);add('repair',6,4,0);

    st.wires=[
      {a:{x:0,y:10},b:{x:0,y:6}},
      {a:{x:0,y:11},b:{x:1,y:8}},
      {a:{x:0,y:10},b:{x:3,y:8}},
      {a:{x:0,y:11},b:{x:4,y:9}},
      {a:{x:0,y:10},b:{x:5,y:8}},
      {a:{x:0,y:11},b:{x:5,y:9}},
      {a:{x:0,y:10},b:{x:7,y:7}},
      {a:{x:0,y:11},b:{x:9,y:8}},
      {a:{x:0,y:10},b:{x:6,y:4}},
      {a:{x:0,y:11},b:{x:7,y:5}}
    ];
    st.mode='place';st.rot=0;setTray(false);
    q('#hint').innerHTML='<b>추천 회로.</b> CORE +12V/GND 두 선을 기준으로 각 장치의 +/−를 연결했습니다.';
    draw()
  };

  q('#check').onclick=function(){
    var e=calc();q('#hint').innerHTML=e.w.length?'<b>경고:</b> '+e.w[0]:'<b>정상.</b> '+e.d.toFixed(0)+' DPS · 회복 '+e.h.toFixed(1)+'/s · CAP '+e.cap+'개'
  };

  q('#fight').onclick=function(){
    var ev=calc();if(st.busy||ev.d<=0||ev.short)return;st.busy=true;setTray(false);draw();
    var ph=100,eh=180+(st.stage-1)*45,max=eh,t=0;
    var timer=setInterval(function(){
      var x=calc();eh-=(x.d-1.2)*.1;ph-=(7+(st.stage-1))*.1;ph+=x.h*.1;ph=Math.min(100,ph);t+=.1;
      q('#pbar').style.width=Math.max(0,ph)+'%';q('#ebar').style.width=Math.max(0,eh/max*100)+'%';
      q('#php').textContent=Math.max(0,Math.ceil(ph));q('#ehp').textContent=Math.max(0,Math.ceil(eh));
      if(eh<=0||ph<=0||t>35){
        clearInterval(timer);st.busy=false;
        if(eh<=0){st.credits+=60;q('#credits').textContent=st.credits;q('#modal').classList.add('show');shop()}
        else q('#hint').innerHTML='<b>패배.</b> 공격/회복/전원 구성을 다시 보세요.';
        draw()
      }
    },100)
  };

  function shop(){
    var box=q('#shop'),o=[['cap','CAP +1',35],['battery','배터리 +1',45],['pulse','펄스포 +1',70]];box.innerHTML='';
    o.forEach(function(a){
      var b=document.createElement('button');b.className='offer';b.disabled=st.credits<a[2];
      b.innerHTML='<b>'+a[1]+'</b><span>다음 빌드 선택지 확장</span><em>'+a[2]+' CR</em>';
      b.onclick=function(){if(st.credits<a[2])return;st.credits-=a[2];st.inv[a[0]]++;q('#credits').textContent=st.credits;b.disabled=true;b.innerHTML+='<span>구매 완료</span>';palette()};
      box.appendChild(b)
    })
  }

  q('#next').onclick=function(){
    st.stage++;q('#stage').textContent=st.stage;q('#ehp').textContent=180+(st.stage-1)*45;q('#php').textContent=100;
    q('#pbar').style.width='100%';q('#ebar').style.width='100%';q('#modal').classList.remove('show');
    q('#hint').innerHTML='<b>Stage '+st.stage+'.</b> 부품 트레이를 열어 회로를 다시 구성할 수 있습니다.'
  };

  makeBoard();setTray(true);draw()
})();
