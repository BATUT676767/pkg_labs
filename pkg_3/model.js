function installImageModel() {
  const byte=x=>Math.min(255,Math.max(0,Math.round(x)));
  const validate=(n,lo,hi,name)=>{if(!Number.isFinite(n)||n<lo||n>hi)throw new Error(`Некорректный параметр: ${name}`);};
  function histogram(image) {
    const h=Array.from({length:5},()=>new Uint32Array(256));const a=image.data;
    for(let i=0;i<a.length;i+=4){if(!a[i+3])continue;h[0][a[i]]++;h[1][a[i+1]]++;h[2][a[i+2]]++;h[3][Math.max(a[i],a[i+1],a[i+2])]++;h[4][byte(.2126*a[i]+.7152*a[i+1]+.0722*a[i+2])]++;}
    return h;
  }
  function metrics(h) {
    let count=0,sum=0,squares=0,entropy=0,min=255,max=0;
    for(let i=0;i<256;i++){count+=h[i];sum+=i*h[i];squares+=i*i*h[i];if(h[i]){min=Math.min(min,i);max=i;}}
    if(!count)return {count:0,mean:0,std:0,entropy:0,min:0,max:0};
    for(const n of h)if(n){const p=n/count;entropy-=p*Math.log2(p);}
    return {count,mean:sum/count,std:Math.sqrt(Math.max(0,squares/count-(sum/count)**2)),entropy,min,max};
  }
  function kernel(kind,radius,sigma=1.5) {
    validate(radius,0,30,'радиус');validate(sigma,.1,30,'σ');if(!Number.isInteger(radius))throw new Error('Радиус должен быть целым');
    if(!['gaussian','box'].includes(kind))throw new Error('Неизвестный фильтр');
    const k=new Float64Array(radius*2+1);let sum=0;
    for(let i=-radius;i<=radius;i++){const value=kind==='box'?1:Math.exp(-i*i/(2*sigma*sigma));k[i+radius]=value;sum+=value;}
    return k.map(x=>x/sum);
  }
  function smooth(image,options,progress=()=>{}) {
    const {width:w,height:h,data:a}=image,{radius:r,edge,filter,sigma}=options,k=kernel(filter,r,sigma);
    const temp=new Float32Array(a.length),out=new Uint8ClampedArray(a.length),xs=new Int32Array(w*k.length),ys=new Int32Array(h*k.length);
    for(let x=0;x<w;x++)for(let j=0;j<k.length;j++)xs[x*k.length+j]=PixelBuffer.edge(x+j-r,w,edge);
    for(let y=0;y<h;y++)for(let j=0;j<k.length;j++)ys[y*k.length+j]=PixelBuffer.edge(y+j-r,h,edge);
    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){const p=(y*w+x)*4;let red=0,green=0,blue=0,alpha=0;
        for(let j=0;j<k.length;j++){const q=(y*w+xs[x*k.length+j])*4,weight=k[j],wa=weight*a[q+3]/255;red+=a[q]*wa;green+=a[q+1]*wa;blue+=a[q+2]*wa;alpha+=a[q+3]*weight;}
        temp[p]=red;temp[p+1]=green;temp[p+2]=blue;temp[p+3]=alpha;
      }
      if(y%16===0)progress(y/(2*h));
    }
    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){const p=(y*w+x)*4;let red=0,green=0,blue=0,alpha=0;
        for(let j=0;j<k.length;j++){const q=(ys[y*k.length+j]*w+x)*4,weight=k[j];red+=temp[q]*weight;green+=temp[q+1]*weight;blue+=temp[q+2]*weight;alpha+=temp[q+3]*weight;}
        out[p+3]=byte(alpha);if(alpha>1e-8){out[p]=byte(red*255/alpha);out[p+1]=byte(green*255/alpha);out[p+2]=byte(blue*255/alpha);}
      }
      if(y%16===0)progress(.5+y/(2*h));
    }
    progress(1);return new PixelBuffer(w,h,out);
  }
  function lut(hist,kind) {
    const values=Uint8Array.from({length:256},(_,i)=>i),m=metrics(hist);
    if(!m.count||m.min===m.max)return values;
    if(kind==='linear'){for(let i=0;i<256;i++)values[i]=byte((i-m.min)*255/(m.max-m.min));return values;}
    let cdf=0;const first=hist[m.min];
    for(let i=0;i<256;i++){cdf+=hist[i];values[i]=byte((cdf-first)*255/(m.count-first));}
    return values;
  }
  function transform(image,method,tables,progress=()=>{}) {
    const out=image.data.slice(),a=image.data;
    for(let y=0;y<image.height;y++){
      for(let x=0;x<image.width;x++){const p=(y*image.width+x)*4;if(!a[p+3])continue;
        if(method==='rgb'){for(let c=0;c<3;c++)out[p+c]=tables[c][a[p+c]];}
        else {const v=Math.max(a[p],a[p+1],a[p+2]),next=tables[0][v];for(let c=0;c<3;c++)out[p+c]=v?byte(a[p+c]*next/v):next;}
      }
      if(y%32===0)progress(y/image.height);
    }
    progress(1);return new PixelBuffer(image.width,image.height,out);
  }
  function clippedValue(hist,total,value,clipLimit) {
    if(!total)return value;
    let bins=0;for(let i=0;i<256;i++)if(hist[i])bins++;
    if(bins<=1)return value;
    const limit=Math.max(1,Math.floor(clipLimit*total/256));let excess=0,cdf=0;
    for(let i=0;i<256;i++){const n=Math.min(hist[i],limit);excess+=hist[i]-n;if(i<=value)cdf+=n;}
    const base=Math.floor(excess/256),remainder=excess%256;
    cdf+=base*(value+1);
    for(let j=0;j<remainder;j++)if(Math.floor((j+.5)*256/remainder)<=value)cdf++;
    return byte(255*cdf/total);
  }
  function clahe(image,options,progress=()=>{}) {
    const {width:w,height:h,data:a}=image,r=options.claheRadius,edge=options.edge,clip=options.clipLimit;
    validate(r,1,64,'радиус CLAHE');validate(clip,1,16,'ограничение контраста');if(!Number.isInteger(r))throw new Error('Радиус должен быть целым');
    const out=a.slice(),columns=new Int32Array(w*256),counts=new Int32Array(w),hist=new Int32Array(256);
    function changeRow(y,delta){y=PixelBuffer.edge(y,h,edge);for(let x=0;x<w;x++){const p=(y*w+x)*4;if(a[p+3]){columns[x*256+Math.max(a[p],a[p+1],a[p+2])]+=delta;counts[x]+=delta;}}}
    for(let y=-r;y<=r;y++)changeRow(y,1);
    for(let y=0;y<h;y++){
      hist.fill(0);let total=0;
      for(let x=-r;x<=r;x++){const xx=PixelBuffer.edge(x,w,edge);total+=counts[xx];for(let i=0;i<256;i++)hist[i]+=columns[xx*256+i];}
      for(let x=0;x<w;x++){
        const p=(y*w+x)*4;
        if(a[p+3]){const v=Math.max(a[p],a[p+1],a[p+2]),next=clippedValue(hist,total,v,clip);for(let c=0;c<3;c++)out[p+c]=v?byte(a[p+c]*next/v):next;}
        if(x<w-1){const left=PixelBuffer.edge(x-r,w,edge),right=PixelBuffer.edge(x+r+1,w,edge);total+=counts[right]-counts[left];for(let i=0;i<256;i++)hist[i]+=columns[right*256+i]-columns[left*256+i];}
      }
      if(y<h-1){changeRow(y-r,-1);changeRow(y+r+1,1);}
      if(y%4===0)progress(y/h);
    }
    progress(1);return new PixelBuffer(w,h,out);
  }
  globalThis.ImageModel={histogram,metrics,kernel,smooth,lut,transform,clahe,clippedValue};
}
installImageModel();
if(typeof module!=='undefined')module.exports={...ImageModel,installImageModel};
