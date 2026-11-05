const Geometry={
  EPS:1e-7,
  cmp(a,b=0){return a>b+this.EPS?1:a<b-this.EPS?-1:0;},
  cross(a,b){return a[0]*b[1]-a[1]*b[0];},
  sub(a,b){return [a[0]-b[0],a[1]-b[1]];},
  same(a,b){return Math.hypot(a[0]-b[0],a[1]-b[1])<=this.EPS;},
  area(r){let sum=0;const o=r[0]||[0,0];for(let i=0;i<r.length;i++){const a=this.sub(r[i],o),b=this.sub(r[(i+1)%r.length],o);sum+=this.cross(a,b);}return sum/2;},
  bounds(rings){const p=rings.flat();return [Math.min(...p.map(p=>p[0])),Math.min(...p.map(p=>p[1])),Math.max(...p.map(p=>p[0])),Math.max(...p.map(p=>p[1]))];},
  rectRing(r){return [[r[0],r[1]],[r[2],r[1]],[r[2],r[3]],[r[0],r[3]]];},
  onSegment(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy);if(l<=this.EPS)return this.same(p,a);return Math.abs(dx*(p[1]-a[1])-dy*(p[0]-a[0]))/l<=this.EPS&&p[0]>=Math.min(a[0],b[0])-this.EPS&&p[0]<=Math.max(a[0],b[0])+this.EPS&&p[1]>=Math.min(a[1],b[1])-this.EPS&&p[1]<=Math.max(a[1],b[1])+this.EPS;},
  locate(p,rings){let inside=false;for(const ring of rings)for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length];if(this.onSegment(p,a,b))return 0;if((this.cmp(a[1],p[1])>0)!==(this.cmp(b[1],p[1])>0)){const x=a[0]+(p[1]-a[1])*(b[0]-a[0])/(b[1]-a[1]);if(x>p[0]+this.EPS)inside=!inside;}}return inside?1:-1;},
  intersections(a,b,c,d){const r=this.sub(b,a),s=this.sub(d,c),q=this.sub(c,a),lr=Math.hypot(...r),ls=Math.hypot(...s);if(lr<=this.EPS||ls<=this.EPS)return [];const den=this.cross(r,s),out=[];
    if(Math.abs(den)>this.EPS*Math.max(lr,ls)){const t=this.cross(q,s)/den,u=this.cross(q,r)/den;if(t>=-this.EPS/lr&&t<=1+this.EPS/lr&&u>=-this.EPS/ls&&u<=1+this.EPS/ls)out.push([Math.max(0,Math.min(1,t)),Math.max(0,Math.min(1,u))]);}
    else if(Math.abs(this.cross(q,r))/lr<=this.EPS){const tr=p=>((p[0]-a[0])*r[0]+(p[1]-a[1])*r[1])/(lr*lr),us=p=>((p[0]-c[0])*s[0]+(p[1]-c[1])*s[1])/(ls*ls);for(const p of [a,b,c,d])if(this.onSegment(p,a,b)&&this.onSegment(p,c,d))out.push([Math.max(0,Math.min(1,tr(p))),Math.max(0,Math.min(1,us(p)))]);}
    return out;
  },
  validateRings(rings){if(!Array.isArray(rings)||!rings.length)throw Error('Нужен хотя бы один контур.');let count=0;return rings.map(r=>{if(!Array.isArray(r)||r.length<3)throw Error('В контуре нужно не менее трёх вершин.');const clean=[];for(const p of r){if(!Array.isArray(p)||p.length!==2||!p.every(x=>Number.isFinite(x)&&Math.abs(x)<=1e6))throw Error('Координаты должны быть конечными числами в пределах ±1 000 000.');if(!clean.length||!this.same(p,clean.at(-1)))clean.push([...p]);}if(clean.length>1&&this.same(clean[0],clean.at(-1)))clean.pop();if(clean.length<3)throw Error('Контур вырожден в точку или отрезок.');count+=clean.length;if(count>400)throw Error('Для интерактивного отсечения допускается до 400 вершин.');return clean;});}
};
if(typeof module!=='undefined')module.exports=Geometry;
