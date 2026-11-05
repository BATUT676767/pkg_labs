const Benchmark={
  async run(progress=()=>{}){const result={date:new Date().toISOString(),environment:typeof navigator==='undefined'?process.version:navigator.userAgent,seed:20261105,count:500000,rows:[],operations:[]};let done=0;
    for(const density of [1,4,16]){const data=Data.generate(500000,density);for(const depth of [4,6,8,10]){const start=performance.now(),tree=new Quadtree(data,depth),build=performance.now()-start,times=[];let candidates=0,visible=0,nodes=0;const queries=[];for(let frame=0;frame<512;frame++){const x=1300*Math.cos(frame*.17),y=1100*Math.sin(frame*.13);queries.push([x-300,y-200,x+300,y+200]);}
        for(let q=0;q<queries.length;q+=8){const stats={nodes:0,candidates:0},begin=performance.now();let count=0;for(let batch=0;batch<8;batch++){const r=queries[q+batch],ids=tree.query(r,stats);for(const id of ids){const i=id*4;if(LineClipping.liang([data[i],data[i+1],data[i+2],data[i+3]],r))count++;}}const elapsed=(performance.now()-begin)/8;if(q>=32){times.push(elapsed);candidates+=stats.candidates/8;visible+=count/8;nodes+=stats.nodes/8;}}
        times.sort((a,b)=>a-b);result.rows.push({density,depth,buildMs:build,medianMs:times[30],p95Ms:times[56],maxMs:times.at(-1),candidates:candidates/60,visible:visible/60,nodes:nodes/60});progress({done:++done,total:12,result});await new Promise(r=>setTimeout(r,0));
      }
    }
    const data=Data.generate(500000),r=[-300,-200,300,200];
    for(const algorithm of ['cohen','liang'])for(const filter of [false,true]){const stats=LineClipping.stats(),start=performance.now();let preRejected=0;for(let i=0;i<data.length;i+=4){const s=[data[i],data[i+1],data[i+2],data[i+3]];if(filter&&!LineClipping.aabb(s,r)){preRejected++;continue;}LineClipping[algorithm](s,r,stats);}result.operations.push({algorithm,filter,...stats,preRejected,ms:performance.now()-start});}
    return result;
  }
};
if(typeof module!=='undefined')module.exports=Benchmark;
