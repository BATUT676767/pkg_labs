const Benchmark={
  async run(progress=()=>{},cancelled=()=>false){
    const grid=new VirtualGrid(257,257);let seed=20261020;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const lines=[];for(let i=0;i<100000;i++){let x=1+Math.floor(random()*126),y=1+Math.floor(random()*x);switch(i%8){case 1:[x,y]=[y,x];break;case 2:[x,y]=[-y,x];break;case 3:x=-x;break;case 4:x=-x;y=-y;break;case 5:[x,y]=[-y,-x];break;case 6:[x,y]=[y,-x];break;case 7:y=-y;}lines.push([0,0,x,y]);}
    const circles=Array.from({length:50000},()=>[Math.floor(random()*21)-10,Math.floor(random()*21)-10,1+Math.floor(random()*110)]);
    const rows=[],tasks=[];
    for(const n of [1000,10000,50000,100000])for(const name of ['step','dda','bresenham','wu','castle'])tasks.push({axis:'count',name,n,length:126,data:lines});
    for(const length of [8,32,64,126]){const data=lines.map(p=>[0,0,Math.round(p[2]*length/126),Math.round(p[3]*length/126)]);for(const name of ['step','dda','bresenham'])tasks.push({axis:'length',name,n:100000,length,data});}
    for(const n of [1000,10000,25000,50000])tasks.push({axis:'count',name:'circle',n,length:110,data:circles});
    for(let k=0;k<tasks.length;k++){
      if(cancelled())throw new Error('Остановлено');const task=tasks[k],fn=RasterEngine[task.name];
      for(let i=0;i<1000;i++)fn(...task.data[i],grid);
      const times=[];for(let repeat=0;repeat<3;repeat++){grid.clear();const begin=performance.now();for(let i=0;i<task.n;i++)fn(...task.data[i],grid);times.push(performance.now()-begin);}
      times.sort((a,b)=>a-b);rows.push({axis:task.axis,algorithm:task.name,count:task.n,length:task.length,ms:times[1],min:times[0],max:times[2],pixels:grid.count()});progress({done:k+1,total:tasks.length,rows});await new Promise(resolve=>setTimeout(resolve,0));
    }
    return {date:new Date().toISOString(),seed:20261020,repetitions:3,grid:'257 × 257',environment:typeof navigator==='undefined'?process.version:navigator.userAgent,rows};
  }
};
if(typeof module!=='undefined')module.exports=Benchmark;
