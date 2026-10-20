function imageWorker() {
  self.onmessage=({data:job})=>{
    try {
      const image=new PixelBuffer(job.width,job.height,new Uint8ClampedArray(job.buffer));
      let previous=-1;
      const progress=value=>{const percent=Math.floor(value*20);if(percent!==previous){previous=percent;self.postMessage({type:'progress',id:job.id,value});}};
      let result;
      if(job.operation==='smooth')result=ImageModel.smooth(image,job.options,progress);
      else if(job.operation==='clahe')result=ImageModel.clahe(image,job.options,progress);
      else if(job.operation==='transform')result=ImageModel.transform(image,job.method,job.tables,progress);
      else if(job.operation==='histogram'){self.postMessage({type:'result',id:job.id,histogram:ImageModel.histogram(image)});return;}
      else throw new Error('Неизвестная операция');
      const cropped=result.crop(job.coreStart,job.coreRows);
      self.postMessage({type:'result',id:job.id,buffer:cropped.data.buffer},[cropped.data.buffer]);
    }catch(error){self.postMessage({type:'error',id:job.id,error:error.message});}
  };
}
