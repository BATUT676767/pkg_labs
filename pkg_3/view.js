const ImageView={
  $(id){return document.getElementById(id);},
  number(n,d=2){return n.toLocaleString('ru-RU',{maximumFractionDigits:d});},
  show(id,image){const canvas=this.$(id);canvas.width=image.width;canvas.height=image.height;canvas.getContext('2d').putImageData(new ImageData(image.data,image.width,image.height),0,0);},
  controls(){const filter=this.$('filter').value;this.$('radius').disabled=filter==='none';this.$('sigma').disabled=filter!=='gaussian';this.$('clahe-settings').hidden=this.$('contrast').value!=='clahe';for(const [id,target] of [['radius','radius-value'],['clahe-radius','clahe-radius-value']]){const r=Number(this.$(id).value);this.$(target).textContent=`${r} · окно ${2*r+1} × ${2*r+1}`;}this.$('sigma-value').textContent=this.number(Number(this.$('sigma').value));this.$('clip-value').textContent=this.number(Number(this.$('clip').value));},
  progress(value,label){this.$('progress').value=value;this.$('progress-text').textContent=`${Math.round(value*100)}% · ${label}`;},
  busy(value){this.$('apply').disabled=value;this.$('cancel').disabled=!value;this.$('save').disabled=value||!this.result;},
  plots(){if(!this.result)return;const channel=this.$('channel').value,channels=channel==='rgb'?[0,1,2]:[Number(channel)],log=this.$('log').checked;let max=1;
    for(const group of [this.result.before,this.result.after])for(const c of channels)for(const n of group[c])max=Math.max(max,log?Math.log1p(n):n);
    for(const [id,group] of [['hist-before',this.result.before],['hist-after',this.result.after]]){
      const canvas=this.$(id),ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,left=50,top=10,bottom=h-29,plotw=w-left-25,ploth=bottom-top;ctx.clearRect(0,0,w,h);ctx.font='15px system-ui';ctx.fillStyle='#6a8377';ctx.strokeStyle='#d9e7dc';ctx.lineWidth=1;
      for(let j=0;j<3;j++){const y=top+j*ploth/2;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(w-10,y);ctx.stroke();const actual=log?Math.expm1(max*(1-j/2)):max*(1-j/2);ctx.fillText(actual>=1000?this.number(actual/1000,1)+'k':this.number(actual,0),0,y+4);}
      for(const x of [0,64,128,192,255])ctx.fillText(String(x),left+x/255*plotw-8,h-8);
      for(const c of channels){ctx.beginPath();ctx.moveTo(left,bottom);for(let i=0;i<256;i++){const value=log?Math.log1p(group[c][i]):group[c][i];ctx.lineTo(left+(i+.5)*plotw/256,bottom-value/max*ploth);}ctx.lineTo(left+plotw,bottom);ctx.closePath();ctx.fillStyle=channels.length===1?'#368d7860':['#d7656555','#50a87555','#5a83bc55'][c];ctx.fill();ctx.strokeStyle=channels.length===1?'#24765f':['#bf5151','#388f5c','#4774a9'][c];ctx.stroke();}
    }
  },
  finish(result){this.result=result;this.show('after',result.image);this.plots();const a=ImageModel.metrics(result.before[4]),b=ImageModel.metrics(result.after[4]);for(const key of ['mean','std','entropy'])this.$(key).textContent=`${this.number(a[key])} → ${this.number(b[key])}`;this.$('elapsed').textContent=`${this.number(result.elapsed)} мс`;this.progress(1,`готово · потоков: ${result.threads}`);this.busy(false);},
  clear(){this.result=null;this.$('save').disabled=true;for(const id of ['mean','std','entropy','elapsed'])this.$(id).textContent='—';for(const id of ['hist-before','hist-after']){const c=this.$(id);c.getContext('2d').clearRect(0,0,c.width,c.height);}this.$('progress').value=0;this.$('progress-text').textContent='Готово к обработке';}
};
