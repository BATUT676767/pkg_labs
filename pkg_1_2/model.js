
const ColorModel = (() => {
 const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
 const whites={D65:[0.3127,0.3290],D50:[0.34567,0.35850],E:[1/3,1/3]};
 const xy=([x,y])=>[x/y,1,(1-x-y)/y];
 const mul=(a,v)=>a.map(r=>r.reduce((s,x,i)=>s+x*v[i],0));
 const mm=(a,b)=>a.map(r=>b[0].map((_,j)=>r.reduce((s,x,k)=>s+x*b[k][j],0)));
 const inv=a=>{let t=a.map((r,i)=>r.concat([0,1,2].map(j=>+(i===j))));for(let i=0;i<3;i++){let p=i;for(let j=i+1;j<3;j++)if(Math.abs(t[j][i])>Math.abs(t[p][i]))p=j;[t[i],t[p]]=[t[p],t[i]];let d=t[i][i];if(Math.abs(d)<1e-14)throw Error('Вырожденная матрица');t[i]=t[i].map(x=>x/d);for(let j=0;j<3;j++)if(j!==i){let f=t[j][i];t[j]=t[j].map((x,k)=>x-f*t[i][k]);}}return t.map(r=>r.slice(3));};
 const diag=v=>v.map((x,i)=>v.map((_,j)=>i===j?x:0));

 const matrix=(white='D65')=>{let p=[[.64,.33],[.30,.60],[.15,.06]].map(xy);let base=[0,1,2].map(i=>p.map(v=>v[i]));let src=xy(whites.D65),dst=xy(whites[white]);let rgb=mm(base,diag(mul(inv(base),src)));let b=[[.8951,.2664,-.1614],[-.7502,1.7135,.0367],[.0389,-.0685,1.0296]];let s=mul(b,src),d=mul(b,dst);return mm(mm(mm(inv(b),diag(d.map((x,i)=>x/s[i]))),b),rgb);};
 const linear=x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4;
 const gamma=x=>x<=.0031308?12.92*x:1.055*x**(1/2.4)-.055;
 const rgbToHls=rgb=>{let [r,g,b]=rgb.map(x=>x/255),hi=Math.max(r,g,b),lo=Math.min(r,g,b),d=hi-lo,l=(hi+lo)/2,h=0,s=0;if(d>1e-12){s=d/(1-Math.abs(2*l-1));h=hi===r?((g-b)/d)%6:hi===g?(b-r)/d+2:(r-g)/d+4;h=(h*60+360)%360;}return[h,l*100,s*100];};
 const hlsToRgb=([h,l,s])=>{h=((h%360)+360)%360;l/=100;s/=100;let c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;let v=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];return v.map(x=>(x+m)*255);};
 const rgbToCmyk=(rgb,method='GCR',strength=1)=>{let c=rgb.map(x=>1-x/255),g=Math.min(...c),chroma=Math.max(...c)-g;let k=g*strength;if(method==='UCR'){let t=clamp((g-.5)/.5);k*=t*t*(3-2*t)*(1-chroma);}if(k>=1-1e-12)return[0,0,0,100];return c.map(x=>(x-k)/(1-k)*100).concat(k*100);};
 const cmykToRgb=([c,m,y,k])=>[c,m,y].map(x=>255*(1-x/100)*(1-k/100));
 const rgbToXyz=(r,w)=>mul(matrix(w),r.map(x=>linear(x/255))).map(x=>x*100);
 const xyzToRgb=(v,w)=>mul(inv(matrix(w)),v.map(x=>x/100)).map(x=>gamma(x)*255);
 const xyzToLab=(v,w)=>{let d=6/29,f=t=>t>d**3?Math.cbrt(t):t/(3*d*d)+4/29;let q=v.map((x,i)=>f(x/100/xy(whites[w])[i]));return[116*q[1]-16,500*(q[0]-q[1]),200*(q[1]-q[2])];};
 const labToXyz=([l,a,b],w)=>{let d=6/29,f=t=>t>d?t**3:3*d*d*(t-4/29),y=(l+16)/116;return[y+a/500,y,y-b/200].map((x,i)=>100*f(x)*xy(whites[w])[i]);};
 const gamut=(rgb,strategy='clipping')=>{let changed=rgb.some(x=>x < -1e-7||x>255+1e-7),v=rgb.slice();if(changed&&strategy==='scaling'){let lo=Math.min(0,...v);v=v.map(x=>x-lo);let hi=Math.max(255,...v);v=v.map(x=>x*255/hi);}return{rgb:v.map(x=>clamp(x,0,255)),changed};};
 return{clamp,whites,xy,mul,inv,matrix,rgbToHls,hlsToRgb,rgbToCmyk,cmykToRgb,rgbToXyz,xyzToRgb,xyzToLab,labToXyz,gamut};
})();
