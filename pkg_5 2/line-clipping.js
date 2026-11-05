const LineClipping={
  stats(){return {mul:0,div:0,tested:0,accepted:0,rejected:0};},
  code(x,y,r){return (x<r[0]-Geometry.EPS?1:0)|(x>r[2]+Geometry.EPS?2:0)|(y<r[1]-Geometry.EPS?4:0)|(y>r[3]+Geometry.EPS?8:0);},
  aabb(s,r){return ((Math.max(s[0],s[2])<r[0]-Geometry.EPS?1:0)|(Math.min(s[0],s[2])>r[2]+Geometry.EPS?2:0)|(Math.max(s[1],s[3])<r[1]-Geometry.EPS?4:0)|(Math.min(s[1],s[3])>r[3]+Geometry.EPS?8:0))===0;},
  liang(s,r,stats,trace){if(stats)stats.tested++;const dx=s[2]-s[0],dy=s[3]-s[1],p=[-dx,dx,-dy,dy],q=[s[0]-r[0],r[2]-s[0],s[1]-r[1],r[3]-s[1]];let lo=0,hi=1;
    for(let i=0;i<4;i++){if(Math.abs(p[i])<=Geometry.EPS){if(q[i]<-Geometry.EPS){if(stats)stats.rejected++;return null;}}else{if(stats)stats.div++;const t=q[i]/p[i];if(p[i]<-Geometry.EPS)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(trace)trace.push({edge:i,p:p[i],q:q[i],t,lo,hi});if(lo>hi+Geometry.EPS/Math.max(1,Math.hypot(dx,dy))){if(stats)stats.rejected++;return null;}}}
    if(lo>hi){lo=hi=(lo+hi)/2;}if(stats){stats.mul+=4;stats.accepted++;}return [s[0]+lo*dx,s[1]+lo*dy,s[0]+hi*dx,s[1]+hi*dy];
  },
  cohen(s,r,stats,trace){if(stats)stats.tested++;let [x0,y0,x1,y1]=s,c0=this.code(x0,y0,r),c1=this.code(x1,y1,r);
    for(let i=0;i<16;i++){if(trace)trace.push({step:i,code0:c0.toString(2).padStart(4,'0'),code1:c1.toString(2).padStart(4,'0')});if(!(c0|c1)){if(stats)stats.accepted++;return [x0,y0,x1,y1];}if(c0&c1){if(stats)stats.rejected++;return null;}const c=c0||c1;let x,y;
      if(c&12){y=c&8?r[3]:r[1];if(Math.abs(y1-y0)<=Geometry.EPS){if(stats)stats.rejected++;return null;}x=x0+(x1-x0)*(y-y0)/(y1-y0);}else{x=c&2?r[2]:r[0];if(Math.abs(x1-x0)<=Geometry.EPS){if(stats)stats.rejected++;return null;}y=y0+(y1-y0)*(x-x0)/(x1-x0);}if(stats){stats.mul++;stats.div++;}if(c===c0){x0=x;y0=y;c0=this.code(x0,y0,r);}else{x1=x;y1=y;c1=this.code(x1,y1,r);}}
    throw Error('Превышено число итераций отсечения.');
  },
  convex(ring){const g=Geometry;if(ring.length<3||Math.abs(g.area(ring))<=g.EPS*g.EPS)throw Error('Окно должно быть невырожденным выпуклым многоугольником.');const sign=g.area(ring)>0?1:-1;for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],d=g.sub(b,a),len=Math.hypot(...d);if(len<=g.EPS)throw Error('Совпадающие вершины окна.');for(const p of ring)if(sign*g.cross(d,g.sub(p,a))/len<-g.EPS)throw Error('Для Сайруса—Бека окно должно быть выпуклым.');}return sign;},
  cyrus(s,ring,stats){const sign=this.convex(ring),dx=s[2]-s[0],dy=s[3]-s[1],lenD=Math.hypot(dx,dy);let lo=0,hi=1;if(stats)stats.tested++;
    for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],nx=sign*(a[1]-b[1]),ny=sign*(b[0]-a[0]),l=Math.hypot(nx,ny),f=nx*(s[0]-a[0])+ny*(s[1]-a[1]),den=nx*dx+ny*dy;if(stats)stats.mul+=4;if(Math.abs(den)<=Geometry.EPS*l){if(f<-Geometry.EPS*l){if(stats)stats.rejected++;return null;}}else{const t=-f/den;if(stats)stats.div++;if(den>Geometry.EPS*l)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi+Geometry.EPS/Math.max(1,lenD)){if(stats)stats.rejected++;return null;}}}
    if(lo>hi)lo=hi=(lo+hi)/2;if(stats){stats.accepted++;stats.mul+=4;}return [s[0]+dx*lo,s[1]+dy*lo,s[0]+dx*hi,s[1]+dy*hi];
  }
};
if(typeof module!=='undefined')module.exports=LineClipping;
