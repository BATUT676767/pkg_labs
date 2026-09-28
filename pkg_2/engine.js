class ScanEngine {
  constructor(onUpdate) { this.onUpdate=onUpdate;this.workers=[];this.generation=0;this.running=false;this.results=[];this.files=[]; }
  cancel() {
    this.generation++;for(const worker of this.workers)worker.terminate();this.workers=[];
    if(this.workerURL)URL.revokeObjectURL(this.workerURL);this.workerURL=null;
    this.running=false;
  }
  start(files, threads=4) {
    this.cancel();this.files=Array.from(files);this.results=[];
    if(this.files.length>100000)throw new Error('Можно выбрать не более 100 000 файлов за один запуск');
    this.total=this.files.length;this.completed=0;this.bytesRead=0;this.inputBytes=this.files.reduce((sum,f)=>sum+f.size,0);this.started=performance.now();this.elapsed=0;this.running=this.total>0;
    this.counts={good:0,bad:0,unsupported:0};let cursor=0;const generation=this.generation;
    const notify=()=>{this.elapsed=performance.now()-this.started;this.onUpdate(this);};
    if(!this.running){notify();return;}
    this.workerURL=URL.createObjectURL(new Blob([`(${installMetadata.toString()})();(${metadataWorker.toString()})();`],{type:'text/javascript'}));
    const dispatch=worker=>{
      if(generation!==this.generation)return;
      if(cursor>=this.total)return;
      const items=[];for(let i=0;i<16&&cursor<this.total;i++,cursor++)items.push({index:cursor,file:this.files[cursor]});
      worker.postMessage({items});
    };
    try {
      for(let i=0;i<Math.min(Math.max(1,threads),8,Math.ceil(this.total/16));i++) {
        const worker=new Worker(this.workerURL);this.workers.push(worker);
        worker.onmessage=async ({data})=>{
          if(generation!==this.generation)return;
          if(data.type==='read-range') {
            try {
              const file=this.files[data.index];
              if(!file||!Number.isSafeInteger(data.start)||!Number.isSafeInteger(data.end)||data.start<0||data.end<data.start||data.end>file.size||data.end-data.start>4096)throw new Error('Недопустимый диапазон чтения');
              const blob=file.slice(data.start,data.end);
              let buffer;
              try {buffer=await blob.arrayBuffer();}
              catch {
                buffer=await new Promise((resolve,reject)=>{
                  const reader=new FileReader();
                  reader.onload=()=>resolve(reader.result);
                  reader.onerror=()=>reject(reader.error||new Error('Доступ к файлу запрещён'));
                  reader.readAsArrayBuffer(blob);
                });
              }
              if(generation===this.generation)worker.postMessage({type:'read-range-result',id:data.id,buffer},[buffer]);
            } catch(error) {
              if(generation===this.generation)worker.postMessage({type:'read-range-result',id:data.id,error:error.message});
            }
            return;
          }
          for(const result of data.results){result.path=this.files[result.index].webkitRelativePath||result.name;this.results.push(result);this.completed++;this.bytesRead+=result.bytesRead||0;this.counts[result.status==='Готово'?'good':result.status==='Не поддерживается'?'unsupported':'bad']++;}
          if(this.completed===this.total){this.elapsed=performance.now()-this.started;this.cancel();this.onUpdate(this);}
          else {dispatch(worker);notify();}
        };
        worker.onerror=event=>{event.preventDefault();this.error=event.message||'Не удалось запустить рабочий поток';this.elapsed=performance.now()-this.started;this.cancel();this.onUpdate(this);};
        dispatch(worker);
      }
    } catch(error) {this.cancel();throw new Error(`Не удалось создать Worker: ${error.message}`);}
    this.error='';notify();
  }
}
if(typeof module!=='undefined')module.exports={ScanEngine};
