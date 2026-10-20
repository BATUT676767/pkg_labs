class ProcessingEngine {
  constructor(onProgress){this.onProgress=onProgress;this.generation=0;this.workers=[];this.pending=new Map();this.sequence=0;}
  cancel(){this.generation++;for(const worker of this.workers)worker.terminate();this.workers=[];for(const item of this.pending.values())item.reject(new Error('Обработка остановлена'));this.pending.clear();if(this.url)URL.revokeObjectURL(this.url);this.url=null;}
  startPool(count){this.cancel();this.url=URL.createObjectURL(new Blob([`(${installPixelBuffer.toString()})();(${installImageModel.toString()})();(${imageWorker.toString()})();`],{type:'text/javascript'}));
    try{for(let i=0;i<count;i++){const worker=new Worker(this.url);worker.onmessage=({data})=>{const task=this.pending.get(data.id);if(!task)return;if(data.type==='progress'){task.progress(data.value);return;}this.pending.delete(data.id);if(data.type==='error')task.reject(new Error(data.error));else task.resolve(data);};worker.onerror=event=>{event.preventDefault();for(const item of this.pending.values())item.reject(new Error(event.message||'Ошибка рабочего потока'));this.pending.clear();};this.workers.push(worker);}}catch(e){this.cancel();throw e;}}
  job(worker,job,progress){return new Promise((resolve,reject)=>{job.id=++this.sequence;this.pending.set(job.id,{resolve,reject,progress});try{worker.postMessage(job,[job.buffer]);}catch(e){this.pending.delete(job.id);reject(e);}});}
  async stage(image,operation,options,extra,base,span,label){
    const n=this.workers.length,output=operation==='histogram'?null:new Uint8ClampedArray(image.data.length),fractions=new Float64Array(n);
    const radius=operation==='smooth'?options.radius:operation==='clahe'?options.claheRadius:0;
    const parts=await Promise.all(this.workers.map((worker,i)=>{
      const start=Math.floor(i*image.height/n),end=Math.floor((i+1)*image.height/n),from=Math.max(0,start-radius),to=Math.min(image.height,end+radius);
      const bytes=image.data.slice(from*image.width*4,to*image.width*4);
      const update=value=>{fractions[i]=value;this.onProgress(base+span*fractions.reduce((a,b)=>a+b,0)/n,label);};
      return this.job(worker,{operation,options,width:image.width,height:to-from,buffer:bytes.buffer,coreStart:start-from,coreRows:end-start,...extra},update).then(result=>{if(output)output.set(new Uint8ClampedArray(result.buffer),start*image.width*4);update(1);return result;});
    }));
    if(output)return new PixelBuffer(image.width,image.height,output);
    const h=Array.from({length:5},()=>new Uint32Array(256));for(const part of parts)for(let c=0;c<5;c++)for(let k=0;k<256;k++)h[c][k]+=part.histogram[c][k];return h;
  }
  async run(source,options){
    const count=Math.min(options.threads,source.height,8);this.startPool(count);const generation=this.generation,started=performance.now();
    try {
      const before=await this.stage(source,'histogram',options,{},0,.08,'Гистограмма исходного изображения');
      let result=source;
      if(options.filter!=='none')result=await this.stage(source,'smooth',options,{},.08,.42,'Сглаживание: два одномерных прохода');
      if(options.contrast==='clahe')result=await this.stage(result,'clahe',options,{},.5,.42,'CLAHE: локальные гистограммы');
      else if(options.contrast!=='none'){
        const h=options.filter==='none'?before:await this.stage(result,'histogram',options,{},.5,.08,'Гистограмма после сглаживания');
        const tables=options.contrast==='rgb'?[0,1,2].map(c=>ImageModel.lut(h[c],'equalize')):[ImageModel.lut(h[3],options.contrast==='linear'?'linear':'equalize')];
        result=await this.stage(result,'transform',options,{tables,method:options.contrast==='rgb'?'rgb':'value'},.58,.34,'Преобразование контраста');
      }
      const after=await this.stage(result,'histogram',options,{},.92,.08,'Гистограмма результата');
      return {image:result,before,after,elapsed:performance.now()-started,threads:count,options:{...options}};
    }finally{if(generation===this.generation)this.cancel();}
  }
}
