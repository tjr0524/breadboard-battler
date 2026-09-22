(function(global){
'use strict';

function clamp(v,lo,hi){ return Math.max(lo,Math.min(hi,v)); }

function solveLinear(A,b){
  var n=A.length, i,j,k,p,max,tmp;
  var M=A.map(function(row,ri){ return row.slice().concat([b[ri]]); });
  for(i=0;i<n;i++){
    p=i; max=Math.abs(M[i][i]);
    for(j=i+1;j<n;j++){ if(Math.abs(M[j][i])>max){ max=Math.abs(M[j][i]); p=j; } }
    if(max<1e-14) M[i][i]+=1e-12;
    if(p!==i){ tmp=M[i]; M[i]=M[p]; M[p]=tmp; }
    var piv=M[i][i];
    if(Math.abs(piv)<1e-18) continue;
    for(j=i+1;j<n;j++){
      var f=M[j][i]/piv;
      if(!isFinite(f)||f===0) continue;
      M[j][i]=0;
      for(k=i+1;k<=n;k++) M[j][k]-=f*M[i][k];
    }
  }
  var x=new Array(n).fill(0);
  for(i=n-1;i>=0;i--){
    var s=M[i][n];
    for(j=i+1;j<n;j++) s-=M[i][j]*x[j];
    var d=M[i][i];
    x[i]=Math.abs(d)<1e-18?0:s/d;
    if(!isFinite(x[i])) x[i]=0;
  }
  return x;
}

function CircuitEngine(opts){
  opts=opts||{};
  this.ground=opts.ground||'0';
  this.gmin=opts.gmin||1e-10;
  this.devices=[];
  this.state={};
  this.last=null;
}

CircuitEngine.prototype._rememberNode=function(set,n){
  if(n!==undefined&&n!==null) set[String(n)]=1;
};

CircuitEngine.prototype.addResistor=function(id,a,b,ohms,meta){
  this.devices.push({kind:'resistor',id:id,a:String(a),b:String(b),R:Math.max(1e-9,+ohms),meta:meta||{}});
  return this;
};

CircuitEngine.prototype.addLoad=function(id,a,b,opts){
  opts=opts||{};
  var rv=+opts.ratedVoltage||12, ri=+opts.ratedCurrent||1;
  var R=opts.resistance!=null?+opts.resistance:rv/Math.max(1e-9,ri);
  this.devices.push({
    kind:'load',id:id,a:String(a),b:String(b),R:Math.max(1e-9,R),
    ratedVoltage:rv,ratedCurrent:ri,minVoltage:opts.minVoltage==null?rv*0.6:+opts.minVoltage,
    active:opts.active!==false,offResistance:+opts.offResistance||1e9,
    meta:opts.meta||{}
  });
  return this;
};

CircuitEngine.prototype.addPulseLoad=function(id,a,b,opts){
  opts=opts||{};
  opts.active=!!opts.active;
  var rv=+opts.ratedVoltage||12, ri=+opts.pulseCurrent||+opts.ratedCurrent||8;
  opts.resistance=opts.resistance!=null?opts.resistance:rv/Math.max(1e-9,ri);
  opts.meta=Object.assign({pulse:true},opts.meta||{});
  return this.addLoad(id,a,b,opts);
};

CircuitEngine.prototype.addSource=function(id,p,n,opts){
  opts=opts||{};
  this.devices.push({
    kind:'source',id:id,p:String(p),n:String(n),
    voltage:+opts.voltage||0,
    internalResistance:Math.max(1e-6,opts.internalResistance==null?0.03:+opts.internalResistance),
    currentLimit:opts.currentLimit==null?Infinity:Math.max(0,+opts.currentLimit),
    allowSink:!!opts.allowSink,
    sinkLimit:opts.sinkLimit==null?Infinity:Math.max(0,+opts.sinkLimit),
    meta:opts.meta||{}
  });
  return this;
};

CircuitEngine.prototype.addBattery=function(id,p,n,opts){
  opts=opts||{};
  var cap=opts.capacityJ==null?3600:+opts.capacityJ;
  var soc=opts.soc==null?1:clamp(+opts.soc,0,1);
  this.devices.push({
    kind:'battery',id:id,p:String(p),n:String(n),
    voltage:+opts.voltage||12,
    internalResistance:Math.max(1e-5,opts.internalResistance==null?0.08:+opts.internalResistance),
    currentLimit:opts.currentLimit==null?4:Math.max(0,+opts.currentLimit),
    sinkLimit:opts.sinkLimit==null?2:Math.max(0,+opts.sinkLimit),
    capacityJ:Math.max(1e-6,cap),
    meta:opts.meta||{}
  });
  this.state[id]=Object.assign({soc:soc,energyJ:cap*soc},this.state[id]||{});
  return this;
};

CircuitEngine.prototype.addCapacitor=function(id,a,b,farads,opts){
  opts=opts||{};
  this.devices.push({
    kind:'capacitor',id:id,a:String(a),b:String(b),C:Math.max(1e-12,+farads),
    leakageResistance:opts.leakageResistance==null?1e9:Math.max(1,+opts.leakageResistance),
    maxVoltage:opts.maxVoltage==null?Infinity:Math.max(0,+opts.maxVoltage),
    meta:opts.meta||{}
  });
  if(!this.state[id]) this.state[id]={voltage:+opts.initialVoltage||0};
  return this;
};

CircuitEngine.prototype.addDiode=function(id,a,cathode,opts){
  opts=opts||{};
  this.devices.push({
    kind:'diode',id:id,a:String(a),b:String(cathode),
    vf:opts.forwardVoltage==null?0.65:+opts.forwardVoltage,
    ron:Math.max(1e-5,opts.onResistance==null?0.05:+opts.onResistance),
    roff:Math.max(1e3,opts.offResistance==null?1e9:+opts.offResistance),
    meta:opts.meta||{}
  });
  if(!this.state[id]) this.state[id]={on:false};
  return this;
};

CircuitEngine.prototype.addSwitch=function(id,a,b,opts){
  opts=opts||{};
  this.devices.push({
    kind:'switch',id:id,a:String(a),b:String(b),closed:!!opts.closed,
    ron:Math.max(1e-6,opts.onResistance==null?0.002:+opts.onResistance),
    roff:Math.max(1e3,opts.offResistance==null?1e10:+opts.offResistance),
    meta:opts.meta||{}
  });
  return this;
};

CircuitEngine.prototype.setActive=function(id,active){
  var d=this.devices.find(function(x){return x.id===id;});
  if(d&&(d.kind==='load')) d.active=!!active;
  return this;
};

CircuitEngine.prototype.setSwitch=function(id,closed){
  var d=this.devices.find(function(x){return x.id===id;});
  if(d&&d.kind==='switch') d.closed=!!closed;
  return this;
};

CircuitEngine.prototype.setSourceVoltage=function(id,voltage){
  var d=this.devices.find(function(x){return x.id===id;});
  if(d&&(d.kind==='source'||d.kind==='battery')) d.voltage=+voltage;
  return this;
};

CircuitEngine.prototype._batteryOCV=function(d){
  var st=this.state[d.id]||{soc:1};
  if(st.soc<=0.0001) return 0;
  return d.voltage*(0.88+0.12*st.soc);
};

CircuitEngine.prototype._allNodes=function(){
  var s={};
  s[this.ground]=1;
  this.devices.forEach(function(d){
    ['a','b','p','n'].forEach(function(k){ if(d[k]!=null) s[String(d[k])]=1; });
  });
  return Object.keys(s);
};

CircuitEngine.prototype._solve=function(dt){
  var self=this, nodes=this._allNodes(), ground=this.ground;
  var unknown=nodes.filter(function(n){return n!==ground;});
  var idx={}; unknown.forEach(function(n,i){idx[n]=i;});
  var N=unknown.length;
  var modes={}, diodeOn={};
  this.devices.forEach(function(d){
    if(d.kind==='source'||d.kind==='battery') modes[d.id]='cv';
    if(d.kind==='diode') diodeOn[d.id]=!!(self.state[d.id]&&self.state[d.id].on);
  });

  function stampG(A,a,b,g){
    if(a!==ground) A[idx[a]][idx[a]]+=g;
    if(b!==ground) A[idx[b]][idx[b]]+=g;
    if(a!==ground&&b!==ground){A[idx[a]][idx[b]]-=g;A[idx[b]][idx[a]]-=g;}
  }
  function inject(rhs,from,to,I){
    if(from!==ground) rhs[idx[from]]-=I;
    if(to!==ground) rhs[idx[to]]+=I;
  }
  function voltageOf(V,n){ return n===ground?0:(V[idx[n]]||0); }

  var V=new Array(N).fill(0), iter, changed=true;
  for(iter=0;iter<20&&changed;iter++){
    changed=false;
    var A=new Array(N),rhs=new Array(N).fill(0);
    for(var i=0;i<N;i++){A[i]=new Array(N).fill(0);A[i][i]+=self.gmin;}

    self.devices.forEach(function(d){
      var g,vprev,sv,R,mode;
      if(d.kind==='resistor'){ stampG(A,d.a,d.b,1/d.R); }
      else if(d.kind==='load'){ stampG(A,d.a,d.b,1/(d.active?d.R:d.offResistance)); }
      else if(d.kind==='switch'){ stampG(A,d.a,d.b,1/(d.closed?d.ron:d.roff)); }
      else if(d.kind==='capacitor'){
        stampG(A,d.a,d.b,1/d.leakageResistance);
        if(dt>0){
          g=d.C/dt; stampG(A,d.a,d.b,g);
          vprev=(self.state[d.id]&&self.state[d.id].voltage)||0;
          inject(rhs,d.b,d.a,g*vprev);
        }
      }
      else if(d.kind==='diode'){
        var on=!!diodeOn[d.id];
        if(on){g=1/d.ron;stampG(A,d.a,d.b,g);inject(rhs,d.b,d.a,g*d.vf);}
        else stampG(A,d.a,d.b,1/d.roff);
      }
      else if(d.kind==='source'||d.kind==='battery'){
        sv=d.kind==='battery'?self._batteryOCV(d):d.voltage;
        R=d.internalResistance; mode=modes[d.id];
        if(d.p===d.n) return;
        if(mode==='cv'){ g=1/R; stampG(A,d.p,d.n,g); inject(rhs,d.n,d.p,sv*g); }
        else if(mode==='cc+'){ inject(rhs,d.n,d.p,d.currentLimit); }
        else if(mode==='cc-'){
          var lim=d.kind==='battery'?d.sinkLimit:d.sinkLimit;
          inject(rhs,d.p,d.n,lim);
        }
        else if(mode==='off'){ stampG(A,d.p,d.n,self.gmin); }
      }
    });

    V=solveLinear(A,rhs);

    self.devices.forEach(function(d){
      var va,vb,vd,sv,cur,old,next;
      if(d.kind==='diode'){
        va=voltageOf(V,d.a);vb=voltageOf(V,d.b);vd=va-vb;
        old=!!diodeOn[d.id];next=old?(vd>d.vf-0.05):(vd>d.vf+0.02);
        if(next!==old){diodeOn[d.id]=next;changed=true;}
      } else if(d.kind==='source'||d.kind==='battery'){
        if(d.p===d.n) return;
        va=voltageOf(V,d.p);vb=voltageOf(V,d.n);vd=va-vb;
        sv=d.kind==='battery'?self._batteryOCV(d):d.voltage;
        old=modes[d.id];next=old;
        if(old==='cv'){
          cur=(sv-vd)/d.internalResistance;
          if(cur>d.currentLimit+1e-8) next='cc+';
          else if(cur<0){
            var allow=d.kind==='battery'||d.allowSink;
            var lim=d.kind==='battery'?d.sinkLimit:d.sinkLimit;
            if(!allow) next='off';
            else if(-cur>lim+1e-8) next='cc-';
          }
        } else if(old==='cc+'){
          next=vd<sv-1e-6?'cc+':'cv';
        } else if(old==='cc-'){
          next=vd>sv+1e-6?'cc-':'cv';
        } else if(old==='off'){
          next=vd>sv-1e-6?'off':'cv';
        }
        if(next!==old){modes[d.id]=next;changed=true;}
      }
    });
  }

  var voltages={};nodes.forEach(function(n){voltages[n]=n===ground?0:(V[idx[n]]||0);});
  var branches={},warnings=[];

  this.devices.forEach(function(d){
    var va=(voltages[d.a]!=null?voltages[d.a]:voltages[d.p])||0;
    var vb=(voltages[d.b]!=null?voltages[d.b]:voltages[d.n])||0;
    var v=va-vb,i=0,p=0,status='ok',sv,mode=modes[d.id];

    if(d.kind==='resistor') i=v/d.R;
    else if(d.kind==='load'){
      i=v/(d.active?d.R:d.offResistance);
      if(!d.active) status='idle';
      else if(Math.abs(v)<d.minVoltage) status='undervoltage';
      else if(Math.abs(v)>d.ratedVoltage*1.15) status='overvoltage';
      else status='on';
    }
    else if(d.kind==='switch'){i=v/(d.closed?d.ron:d.roff);status=d.closed?'closed':'open';}
    else if(d.kind==='capacitor'){
      var prev=(self.state[d.id]&&self.state[d.id].voltage)||0;
      i=dt>0?d.C*(v-prev)/dt:v/d.leakageResistance;
      status=Math.abs(v)>d.maxVoltage?'overvoltage':(Math.abs(v)>0.95*d.maxVoltage?'near-limit':'ok');
      if(dt>0) self.state[d.id].voltage=v;
    }
    else if(d.kind==='diode'){
      var on=!!diodeOn[d.id];self.state[d.id].on=on;
      i=on?(v-d.vf)/d.ron:v/d.roff;status=on?'on':'off';
    }
    else if(d.kind==='source'||d.kind==='battery'){
      sv=d.kind==='battery'?self._batteryOCV(d):d.voltage;
      if(d.p===d.n){i=Infinity;status='shorted';warnings.push({type:'source-short',id:d.id});}
      else if(mode==='cv') i=(sv-v)/d.internalResistance;
      else if(mode==='cc+') i=d.currentLimit;
      else if(mode==='cc-') i=-(d.kind==='battery'?d.sinkLimit:d.sinkLimit);
      else i=0;
      status=mode;
      if(d.kind==='battery'&&dt>0&&isFinite(i)){
        var st=self.state[d.id],energy=st.energyJ-v*i*dt;
        st.energyJ=clamp(energy,0,d.capacityJ);st.soc=st.energyJ/d.capacityJ;
      }
    }
    p=v*i;
    branches[d.id]={kind:d.kind,voltage:v,current:i,power:p,status:status,meta:d.meta||{}};
  });

  this.devices.forEach(function(d){
    if(d.kind==='capacitor'){
      var br=branches[d.id];
      if(Math.abs(br.voltage)>d.maxVoltage) warnings.push({type:'capacitor-overvoltage',id:d.id,voltage:br.voltage,limit:d.maxVoltage});
    }
  });

  return {voltages:voltages,branches:branches,warnings:warnings,iterations:iter,dt:dt||0};
};

CircuitEngine.prototype.solveDC=function(){
  this.last=this._solve(0);
  return this.last;
};

CircuitEngine.prototype.step=function(dt){
  dt=Math.max(1e-6,+dt||1/60);
  this.last=this._solve(dt);
  return this.last;
};

CircuitEngine.prototype.capacitorEnergy=function(id){
  var d=this.devices.find(function(x){return x.id===id&&x.kind==='capacitor';});
  var st=this.state[id];if(!d||!st)return 0;
  return 0.5*d.C*st.voltage*st.voltage;
};

CircuitEngine.prototype.getState=function(id){
  return Object.assign({},this.state[id]||{});
};

var api={CircuitEngine:CircuitEngine,version:'0.1.0'};
if(typeof module!=='undefined'&&module.exports) module.exports=api;
global.BreadboardCircuitEngine=api;

})(typeof window!=='undefined'?window:globalThis);
