const PolygonClipping={
  intersect(subject,clip){
    const g=Geometry,A=g.validateRings(subject),B=g.validateRings(clip),edges=[];
    for(const [owner,rings] of [[0,A],[1,B]])for(const ring of rings)for(let i=0;i<ring.length;i++)edges.push({a:ring[i],b:ring[(i+1)%ring.length],owner,cuts:[0,1]});
    let intersections=0;
    for(let i=0;i<edges.length;i++)for(let j=i+1;j<edges.length;j++){const e=edges[i],f=edges[j];if(Math.max(e.a[0],e.b[0])<Math.min(f.a[0],f.b[0])-g.EPS||Math.max(f.a[0],f.b[0])<Math.min(e.a[0],e.b[0])-g.EPS||Math.max(e.a[1],e.b[1])<Math.min(f.a[1],f.b[1])-g.EPS||Math.max(f.a[1],f.b[1])<Math.min(e.a[1],e.b[1])-g.EPS)continue;for(const [t,u] of g.intersections(e.a,e.b,f.a,f.b)){e.cuts.push(t);f.cuts.push(u);intersections++;}}
    const vertices=[],buckets=new Map(),size=g.EPS*2;
    const vertex=p=>{const ix=Math.floor(p[0]/size),iy=Math.floor(p[1]/size);for(let x=ix-1;x<=ix+1;x++)for(let y=iy-1;y<=iy+1;y++)for(const id of buckets.get(x+','+y)||[])if(g.same(p,vertices[id].p))return id;const id=vertices.length,key=ix+','+iy;vertices.push({p,out:[]});if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(id);return id;};
    const arcs=[],seen=new Set();
    for(const e of edges){const dx=e.b[0]-e.a[0],dy=e.b[1]-e.a[1],length=Math.hypot(dx,dy);e.cuts.sort((a,b)=>a-b);const cuts=e.cuts.filter((t,i,arr)=>i===0||(t-arr[i-1])*length>g.EPS);
      for(let i=1;i<cuts.length;i++){const t0=cuts[i-1],t1=cuts[i],a=[e.a[0]+dx*t0,e.a[1]+dy*t0],b=[e.a[0]+dx*t1,e.a[1]+dy*t1],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2],len=(t1-t0)*length;if(len<=g.EPS)continue;
        let delta=Math.min(len*.1,g.EPS*8),left,right;
        for(let k=0;k<4;k++){const n=[-dy/length*delta,dx/length*delta],l=[mid[0]+n[0],mid[1]+n[1]],r=[mid[0]-n[0],mid[1]-n[1]],al=g.locate(l,A),bl=g.locate(l,B),ar=g.locate(r,A),br=g.locate(r,B);left=al>0&&bl>0;right=ar>0&&br>0;if(al!==0&&bl!==0&&ar!==0&&br!==0)break;delta*=2;}
        if(left===right)continue;const from=vertex(left?a:b),to=vertex(left?b:a),key=from+':'+to;if(from===to||seen.has(key))continue;seen.add(key);const id=arcs.length;arcs.push({from,to,owner:e.owner,used:false});vertices[from].out.push(id);
      }
    }
    const rings=[];
    for(let seed=0;seed<arcs.length;seed++){if(arcs[seed].used)continue;let current=seed;const ring=[];
      for(let guard=0;guard<=arcs.length;guard++){const arc=arcs[current];if(arc.used){if(current!==seed)throw Error('Не удалось замкнуть контур при заданной точности.');break;}arc.used=true;ring.push(vertices[arc.from].p);const v=vertices[arc.to],back=Math.atan2(vertices[arc.from].p[1]-v.p[1],vertices[arc.from].p[0]-v.p[0]);let next=-1,best=Infinity;
        for(const id of v.out){if(arcs[id].used&&id!==seed)continue;const p=vertices[arcs[id].to].p,angle=Math.atan2(p[1]-v.p[1],p[0]-v.p[0]),turn=(back-angle+Math.PI*2)%(Math.PI*2);if(turn<best){best=turn;next=id;}}
        if(next<0)throw Error('Разрыв границы: увеличьте расстояние между почти совпадающими рёбрами.');current=next;if(current===seed)break;
      }
      if(ring.length>=3&&Math.abs(g.area(ring))>g.EPS*g.EPS)rings.push(ring);
    }
    return {rings,components:rings.filter(r=>g.area(r)>g.EPS*g.EPS).length,holes:rings.filter(r=>g.area(r)<-g.EPS*g.EPS).length,area:rings.reduce((s,r)=>s+g.area(r),0),intersections,edges:arcs.length};
  }
};
if(typeof module!=='undefined')module.exports=PolygonClipping;
