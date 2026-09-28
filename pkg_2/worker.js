function metadataWorker() {
  let requestId=0;
  const pending=new Map();
  function readRange(index,start,end) {
    return new Promise((resolve,reject)=>{
      const id=++requestId;
      pending.set(id,{resolve,reject});
      self.postMessage({type:'read-range',id,index,start,end});
    });
  }
  self.onmessage = async ({data}) => {
    if(data.type==='read-range-result') {
      const request=pending.get(data.id);
      if(!request)return;
      pending.delete(data.id);
      if(data.error)request.reject(new Error(data.error));else request.resolve(data.buffer);
      return;
    }
    const results = [];
    for (const item of data.items) {
      let useMainReader=false;
      const source={name:item.file.name,size:item.file.size,webkitRelativePath:item.file.webkitRelativePath,slice(start,end){
        return {async arrayBuffer(){
          if(!useMainReader) {
            try{return await item.file.slice(start,end).arrayBuffer();}
            catch {useMainReader=true;}
          }
          return readRange(item.index,start,end);
        }};
      }};
      results.push({index:item.index,...await Metadata.parse(source)});
    }
    self.postMessage({results});
  };
}
