
(function(){
  var C=10,R=12,nextId=1;
  var defs={
    resistor:{n:'저항',s:'R',w:3,h:1,d:'두 노드를 연결'},
    cap:{n:'캐패시터',s:'CAP',w:1,h:2,d:'펄스 경로 저장'},
    battery:{n:'배터리',s:'BAT',w:1,h:3,d:'공급 +0.8A'},
    gun:{n:'기관포',s:'GUN',w:2,h:2,d:'0.8A · 10 DPS'},
    pulse:{n:'펄스포',s:'PULSE',w:3,h:2,d:'CAP 경로 필요'},
    repair:{n:'수리기',s:'FIX',w:2,h:2,d:'0.7A · 회복'}
  };
  var st={
    mode:'place',sel:null,rot:0,wireStart:null,parts:[],wires:[],credits:100,stage:1,busy:false,
    inv:{resistor:3,cap:2,battery:1,gun:2,pulse:1,repair:1}
  };
  function q(s){return document.querySelector(s)}
  function nodeOf(x,y){return y+':'+(x<5?'L':'R')}
  function dims(t,r){var d=defs[t];return r?{w:d.h,h:d.w}:{w:d.w,h:d.h}}
  function hit(p,x,y){
    var d=p.t==='core'?{w:2,h:2}:dims(p.t,p.r);
    return x>=p.x&&x<p.x+d.w&&y>=p.y&&y<p.y+d.h
  }
  function sinkPin(p){
    var d=dims(p.t,p.r);
    if(!p.r) return {x:p.x,y:p.y+d.h-1};
    return {x:p.x+d.w-1,y:p.y}
  }
  function terminals(p){
    if(p.t==='core') return [{x:p.x+1,y:p.y}];
    if(p.t==='gun'||p.t==='pulse'||p.t==='repair') return [sinkPin(p)];
    var d=dims(p.t,p.r);
    if(!p.r) return [{x:p.x,y:p.y},{x:p.x+d.w-1,y:p.y+d.h-1}];
    return [{x:p.x,y:p.y},{x:p.x+d.w-1,y:p.y+d.h-1}]
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
    if(!canPlace(t,x,y,r)||!st.inv[t])return false;
    st.inv[t]--;
    st.parts.push({id:nextId++,t:t,x:x,y:y,r:r});
    draw();return true
  }
  function wireCenter(h){return{x:(h.x+.5)*100,y:(h.y+.5)*100}}
  function buildGraph(){
    var g={};
    function edge(a,b,tag){
      if(a===b)return;
      (g[a]||(g[a]=[])).push({to:b,tag:tag||'wire'});
      (g[b]||(g[b]=[])).push({to:a,tag:tag||'wire'})
    }
    st.wires.forEach(function(w){edge(nodeOf(w.a.x,w.a.y),nodeOf(w.b.x,w.b.y),'wire')});
    st.parts.forEach(function(p){
      if(p.t==='resistor'||p.t==='cap'||p.t==='battery'){
        var t=terminals(p),a=nodeOf(t[0].x,t[0].y),b=nodeOf(t[1].x,t[1].y);
        edge(a,b,p.t)
      }
    });
    return g
  }
  function powerMap(){
    var g=buildGraph(),source=nodeOf(terminals(st.parts[0])[0].x,terminals(st.parts[0])[0].y);
    var seen={},capSeen={},queue=[{n:source,c:false}];
    while(queue.length){
      var cur=queue.shift(),key=cur.n+'|'+(cur.c?1:0);
      if(seen[key])continue;seen[key]=1;
      if(cur.c)capSeen[cur.n]=1;
      (g[cur.n]||[]).forEach(function(e){
        queue.push({n:e.to,c:cur.c||e.tag==='cap'})
      })
    }
    var powered={};Object.keys(seen).forEach(function(k){powered[k.split('|')[0]]=1});
    return{powered:powered,capSeen:capSeen,graph:g}
  }
  function shorted(p){
    if(!(p.t==='resistor'||p.t==='cap'||p.t==='battery'))return false;
    var t=terminals(p);return nodeOf(t[0].x,t[0].y)===nodeOf(t[1].x,t[1].y)
  }
  function calc(){
    var pm=powerMap(),supply=2.5,need=0,dps=0,heal=0,warn=[];
    st.parts.forEach(function(p){
      if(p.t!=='battery')return;
      var t=terminals(p);
      if(!shorted(p)&&(pm.powered[nodeOf(t[0].x,t[0].y)]||pm.powered[nodeOf(t[1].x,t[1].y)]))supply+=.8
    });
    st.parts.forEach(function(p){
      if(p.t==='core'||p.t==='resistor'||p.t==='cap'||p.t==='battery')return;
      var pin=sinkPin(p),n=nodeOf(pin.x,pin.y),on=!!pm.powered[n];
      if(!on)return;
      if(p.t==='gun'){need+=.8;dps+=10}
      if(p.t==='repair'){need+=.7;heal+=3}
      if(p.t==='pulse'){
        need+=1.2;
        if(pm.capSeen[n])dps+=18;
        else warn.push('펄스포 전원 경로에 캐패시터가 없습니다')
      }
    });
    st.parts.forEach(function(p){if(shorted(p))warn.push(defs[p.t].n+'의 두 핀이 같은 내부 연결선에 꽂혀 있습니다')});
    var f=need?Math.min(1,supply/need):1;
    if(need>supply)warn.push('공급 가능한 전류보다 요구 전류가 큽니다');
    return{pm:pm,s:supply,n:need,d:dps*f,h:heal*f,w:warn}
  }
  function makeBoard(){
    var sl=q('#stripLayer');
    for(var y=0;y<R;y++){
      ['L','R'].forEach(function(side){
        var line=document.createElement('div');line.className='strip-line';
        line.style.top=((y+.5)*100/R)+'%';
        line.style.left=side==='L'?'4.8%':'54.8%';
        line.style.width='40.4%';sl.appendChild(line)
      })
    }
    var grid=q('#grid');
    for(var i=0;i<C*R;i++){
      var c=document.createElement('div');c.className='cell';c.dataset.x=i%C;c.dataset.y=Math.floor(i/C);
      c.addEventListener('click',tapHole);grid.appendChild(c)
    }
  }
  function tapHole(e){
    if(st.busy)return;
    var c=e.currentTarget,x=+c.dataset.x,y=+c.dataset.y;
    if(st.mode==='wire'){
      if(!st.wireStart){
        st.wireStart={x:x,y:y};
        q('#hint').innerHTML='<b>같이 빛나는 5개 홀은 이미 내부 연결입니다.</b> 다른 홀을 탭해 점퍼선을 연결하세요.';
      }else{
        var a=st.wireStart,b={x:x,y:y};
        if(nodeOf(a.x,a.y)===nodeOf(b.x,b.y)){
          q('#hint').innerHTML='<b>점퍼선 불필요.</b> 두 홀은 빵판 내부에서 이미 연결되어 있습니다.';
        }else{
          var dup=st.wires.some(function(w){
            return (w.a.x===a.x&&w.a.y===a.y&&w.b.x===b.x&&w.b.y===b.y)||(w.b.x===a.x&&w.b.y===a.y&&w.a.x===b.x&&w.a.y===b.y)
          });
          if(!dup)st.wires.push({a:a,b:b});
          q('#hint').textContent='점퍼선 연결 완료.';
        }
        st.wireStart=null
      }
      draw();return
    }
    if(st.mode==='place'&&st.sel){
      if(!add(st.sel,x,y,st.rot))q('#hint').textContent='그 위치에는 부품이 들어가지 않습니다.';
    }
  }
  function drawParts(ev){
    var pl=q('#parts');pl.innerHTML='';
    st.parts.forEach(function(p){
      var d=p.t==='core'?{w:2,h:2}:dims(p.t,p.r);
      var b=document.createElement('button');b.type='button';b.className='part '+p.t;
      var pin=p.t==='core'?terminals(p)[0]:sinkPin(p);
      var powered=p.t==='core'||!!ev.pm.powered[nodeOf(pin.x,pin.y)];
      if(powered)b.classList.add('powered');if(shorted(p))b.classList.add('short');
      b.style.left=(p.x*10)+'%';b.style.top=(p.y*100/R)+'%';b.style.width=(d.w*10)+'%';b.style.height=(d.h*100/R)+'%';
      b.innerHTML=p.t==='core'?'CORE<small>12V · 2.5A</small>':defs[p.t].s+'<small>'+defs[p.t].n+'</small>';
      terminals(p).forEach(function(t){
        var dot=document.createElement('i');dot.className='pin';
        dot.style.left=((t.x-p.x+.5)/d.w*100)+'%';dot.style.top=((t.y-p.y+.5)/d.h*100)+'%';b.appendChild(dot)
      });
      b.addEventListener('click',function(e){
        e.stopPropagation();
        if(st.mode==='erase'&&p.t!=='core'){
          st.inv[p.t]++;st.parts=st.parts.filter(function(x){return x.id!==p.id});draw()
        }
      });
      pl.appendChild(b)
    })
  }
  function drawWires(){
    var wl=q('#wireLayer');wl.innerHTML='';
    st.wires.forEach(function(w){
      var A=wireCenter(w.a),B=wireCenter(w.b),mid=(A.x+B.x)/2;
      var path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('class','wire');
      path.setAttribute('d','M '+A.x+' '+A.y+' L '+mid+' '+A.y+' L '+mid+' '+B.y+' L '+B.x+' '+B.y);wl.appendChild(path)
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
  function palette(){
    var p=q('#palette');p.innerHTML='';
    Object.keys(defs).forEach(function(t){
      var d=defs[t],b=document.createElement('button');b.type='button';b.className='piece'+(st.sel===t?' on':'');
      b.disabled=st.busy||!st.inv[t];
      b.innerHTML='<b>'+d.n+'</b><span>'+d.d+'</span><em>×'+st.inv[t]+' · '+d.w+'×'+d.h+'</em>';
      b.onclick=function(){
        st.mode='place';st.sel=t;st.wireStart=null;
        q('#hint').innerHTML='<b>'+d.n+'</b> 선택됨. 빵판의 시작 홀을 탭하세요.';
        draw()
      };p.appendChild(b)
    })
  }
  function draw(){
    var ev=calc();drawParts(ev);drawWires();drawGrid();palette();
    q('#board').classList.toggle('wiremode',st.mode==='wire');
    q('#wire').classList.toggle('on',st.mode==='wire');q('#erase').classList.toggle('on',st.mode==='erase');q('#rotate').classList.toggle('on',st.rot===1);
    q('#amps').textContent=ev.n.toFixed(1)+'/'+ev.s.toFixed(1)+'A';q('#dps').textContent=ev.d.toFixed(0);q('#heal').textContent=ev.h.toFixed(1);
    var used=0;st.parts.forEach(function(p){var d=p.t==='core'?{w:2,h:2}:dims(p.t,p.r);used+=d.w*d.h});
    q('#space').textContent=Math.round(used/C/R*100)+'%';q('#fight').disabled=st.busy||ev.d<=0
  }
  function clearBoard(){
    st.parts.slice(1).forEach(function(p){st.inv[p.t]++});
    st.parts=st.parts.slice(0,1);st.wires=[];st.sel=null;st.wireStart=null
  }
  q('#wire').onclick=function(){
    st.mode=st.mode==='wire'?'place':'wire';st.sel=null;st.wireStart=null;
    q('#hint').innerHTML=st.mode==='wire'?'<b>배선 모드.</b> 홀 → 홀 순서로 탭하세요. 같은 가로 5개는 이미 연결되어 있습니다.':'배선 모드 종료.';draw()
  };
  q('#erase').onclick=function(){st.mode=st.mode==='erase'?'place':'erase';st.sel=null;st.wireStart=null;q('#hint').textContent=st.mode==='erase'?'지울 부품을 탭하세요.':'지우기 종료.';draw()};
  q('#rotate').onclick=function(){st.rot=st.rot?0:1;q('#hint').textContent=st.rot?'다음 부품은 90° 회전되어 놓입니다.':'기본 방향.';draw()};
  q('#reset').onclick=function(){clearBoard();draw();q('#hint').textContent='빵판을 초기화했습니다.'};
  q('#reco').onclick=function(){
    clearBoard();
    var need={resistor:1,gun:1,cap:1,pulse:1,repair:1};for(var k in need)if(st.inv[k]<need[k])return;
    add('resistor',1,7,1);add('gun',2,6,0);add('cap',4,8,0);add('pulse',5,7,0);add('repair',7,9,0);
    st.wires=[
      {a:{x:1,y:10},b:{x:1,y:9}},
      {a:{x:1,y:10},b:{x:4,y:9}},
      {a:{x:4,y:8},b:{x:5,y:8}},
      {a:{x:1,y:10},b:{x:5,y:10}}
    ];
    st.mode='place';st.sel=null;st.rot=0;
    q('#hint').innerHTML='<b>추천 회로.</b> 가로 5홀 내부 연결을 이용해 같은 기능을 더 작게 재배치해보세요.';draw()
  };
  q('#check').onclick=function(){var e=calc();q('#hint').innerHTML=e.w.length?'<b>경고:</b> '+e.w[0]:'<b>정상.</b> '+e.d.toFixed(0)+' DPS · 회복 '+e.h.toFixed(1)+'/s'};
  q('#fight').onclick=function(){
    var ev=calc();if(st.busy||ev.d<=0)return;st.busy=true;draw();
    var ph=100,eh=180+(st.stage-1)*45,max=eh,t=0;
    var timer=setInterval(function(){
      var x=calc();eh-=(x.d-1.2)*.1;ph-=(7+(st.stage-1))*.1;ph+=x.h*.1;ph=Math.min(100,ph);t+=.1;
      q('#pbar').style.width=Math.max(0,ph)+'%';q('#ebar').style.width=Math.max(0,eh/max*100)+'%';
      q('#php').textContent=Math.max(0,Math.ceil(ph));q('#ehp').textContent=Math.max(0,Math.ceil(eh));
      if(eh<=0||ph<=0||t>35){
        clearInterval(timer);st.busy=false;
        if(eh<=0){st.credits+=60;q('#credits').textContent=st.credits;q('#modal').classList.add('show');shop()}
        else q('#hint').innerHTML='<b>패배.</b> 공격/회복과 전원 경로를 다시 구성해보세요.';
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
    q('#pbar').style.width='100%';q('#ebar').style.width='100%';q('#modal').classList.remove('show');q('#hint').innerHTML='<b>Stage '+st.stage+'.</b> 빵판을 다시 손봐도 됩니다.'
  };
  makeBoard();
  st.parts=[{id:nextId++,t:'core',x:0,y:10,r:0}];
  draw()
})();
