const RasterEngine={
  step(x0,y0,x1,y1,t) {
    const dx=x1-x0,dy=y1-y0,n=Math.max(Math.abs(dx),Math.abs(dy));
    if(!n){t.setPixel(x0,y0,1);return;}
    if(Math.abs(dx)>=Math.abs(dy))for(let i=0;i<=n;i++){const x=x0+i*Math.sign(dx);t.setPixel(x,Math.round(y0+dy*(x-x0)/dx),1);}
    else for(let i=0;i<=n;i++){const y=y0+i*Math.sign(dy);t.setPixel(Math.round(x0+dx*(y-y0)/dy),y,1);}
  },
  dda(x0,y0,x1,y1,t) {
    const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0));
    if(!n){t.setPixel(x0,y0,1);return;}
    const dx=(x1-x0)/n,dy=(y1-y0)/n;let x=x0,y=y0;
    for(let i=0;i<=n;i++,x+=dx,y+=dy)t.setPixel(Math.round(x),Math.round(y),1);
  },
  bresenham(x0,y0,x1,y1,t) {
    const dx=Math.abs(x1-x0),dy=Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1;
    if(dx>=dy){let e=2*dy-dx;for(let i=0;i<=dx;i++){t.setPixel(x0,y0,1);if(e>=0){y0+=sy;e-=2*dx;}e+=2*dy;x0+=sx;}}
    else{let e=2*dx-dy;for(let i=0;i<=dy;i++){t.setPixel(x0,y0,1);if(e>=0){x0+=sx;e-=2*dy;}e+=2*dx;y0+=sy;}}
  },
  circle(cx,cy,r,t) {
    let x=0,y=r,d=3-2*r;
    while(x<=y){for(const [a,b] of [[x,y],[y,x],[-x,y],[-y,x],[x,-y],[y,-x],[-x,-y],[-y,-x]])t.setPixel(cx+a,cy+b,1);if(d<0)d+=4*x+6;else{d+=4*(x-y)+10;y--;}x++;}
  },
  wu(x0,y0,x1,y1,t) {
    if(x0===x1&&y0===y1){t.setPixel(x0,y0,1);return;}
    const steep=Math.abs(y1-y0)>Math.abs(x1-x0);
    if(steep){[x0,y0]=[y0,x0];[x1,y1]=[y1,x1];}if(x0>x1){[x0,x1]=[x1,x0];[y0,y1]=[y1,y0];}
    const g=(y1-y0)/(x1-x0),f=v=>v-Math.floor(v),put=(x,y,a)=>steep?t.setPixel(y,x,a):t.setPixel(x,y,a);
    function end(x,y,gap){const b=Math.floor(y);put(x,b,(1-f(y))*gap);put(x,b+1,f(y)*gap);}
    end(x0,y0,.5);end(x1,y1,.5);let y=y0+g;
    for(let x=x0+1;x<x1;x++,y+=g)end(x,y,1);
  },
  castle(x0,y0,x1,y1,t) {
    const dx=Math.abs(x1-x0),dy=Math.abs(y1-y0),steep=dy>dx,N=Math.max(dx,dy),M=Math.min(dx,dy),sx=Math.sign(x1-x0),sy=Math.sign(y1-y0);
    if(!N){t.setPixel(x0,y0,1);return;}
    let word;
    if(M===0)word='0'.repeat(N);else if(M===N)word='1'.repeat(N);else{
      let a=N-M,b=M,u='0',v='1';
      while(a!==b){if(a>b){a-=b;v=u+v;}else{b-=a;u=u+v;}}
      word=(u+v).repeat(a);
      const phase=Math.floor(N/(2*a))*a;let shift=0;while((shift*M)%N!==phase)shift++;word=word.slice(shift)+word.slice(0,shift);
    }
    let x=x0,y=y0;t.setPixel(x,y,1);
    for(const ch of word){if(steep){y+=sy;if(ch==='1')x+=sx;}else{x+=sx;if(ch==='1')y+=sy;}t.setPixel(x,y,1);}
  },
  ellipse(cx,cy,a,b,t,start=0,sweep=360) {
    const emit=(x,y)=>{
      if(sweep<360){const angle=(Math.atan2(y,x)*180/Math.PI+360)%360;if((angle-start+360)%360>sweep+1e-9)return;}
      t.setPixel(cx+x,cy+y,1);
    };
    if(!a||!b){const target={setPixel:(x,y)=>emit(x-cx,y-cy)};this.bresenham(cx-a,cy-b,cx+a,cy+b,target);return;}
    let x=0,y=b,aa=a*a,bb=b*b,dx=0,dy=2*aa*y,d=4*bb-4*aa*b+aa;
    const plot=()=>{emit(x,y);emit(-x,y);emit(x,-y);emit(-x,-y);};
    while(dx<dy){plot();x++;dx+=2*bb;if(d<0)d+=4*dx+4*bb;else{y--;dy-=2*aa;d+=4*dx-4*dy+4*bb;}}
    d=bb*(2*x+1)**2+4*aa*(y-1)**2-4*aa*bb;
    while(y>=0){plot();y--;dy-=2*aa;if(d>0)d+=4*aa-4*dy;else{x++;dx+=2*bb;d+=4*dx-4*dy+4*aa;}}
    while(x<a){x++;emit(x,0);emit(-x,0);}
  }
};
if(typeof module!=='undefined')module.exports=RasterEngine;
