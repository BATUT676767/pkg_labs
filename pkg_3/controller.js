(() => {
  const view=ImageView,$=id=>view.$(id);let source=null,sourceName='image',version=0,loadVersion=0;
  const engine=new ProcessingEngine((value,label)=>view.progress(value,label));
  const options=()=>({filter:$('filter').value,radius:Number($('radius').value),sigma:Number($('sigma').value),edge:$('edge').value,contrast:$('contrast').value,claheRadius:Number($('clahe-radius').value),clipLimit:Number($('clip').value),threads:Number($('threads').value)});
  function cancel(){version++;engine.cancel();view.busy(false);$('progress-text').textContent='Обработка остановлена';}
  function setSource(image,name,description=''){cancel();source=image;sourceName=name;$('source-name').textContent=name;$('source-size').textContent=`${image.width} × ${image.height} px`;$('sample-description').textContent=description;$('notice').textContent='';view.clear();view.show('before',image);view.show('after',image);$('result-label').textContent='Исходное изображение';}
  async function apply(){if(!source)return;const id=++version,settings=options();view.busy(true);$('notice').textContent='';
    try{const result=await engine.run(source,settings);if(id!==version)return;view.finish(result);const filter={none:'',gaussian:'Гаусс',box:'Бокс-фильтр'}[settings.filter],contrast={none:'',linear:'Линейное растяжение V',rgb:'Эквализация RGB',hsv:'Эквализация HSV',clahe:'CLAHE'}[settings.contrast];$('result-label').textContent=[filter,contrast].filter(Boolean).join(' + ')||'Без изменений';}
    catch(error){if(id===version){view.busy(false);$('notice').textContent=error.message;$('progress-text').textContent='Не удалось завершить обработку';}}
  }
  function sample(kind){loadVersion++;const item=SampleImages.items.find(x=>x[0]===kind);setSource(SampleImages.make(kind),item[1],item[2]);for(const b of $('samples').children)b.classList.toggle('active',b.dataset.kind===kind);apply();}
  for(const item of SampleImages.items){const button=document.createElement('button'),canvas=document.createElement('canvas'),image=SampleImages.make(item[0],160,100);canvas.width=160;canvas.height=100;canvas.getContext('2d').putImageData(new ImageData(image.data,160,100),0,0);button.append(canvas,document.createTextNode(item[1]));button.dataset.kind=item[0];button.onclick=()=>sample(item[0]);$('samples').append(button);}
  $('open').onclick=()=>$('file').click();
  $('file').onchange=async event=>{const file=event.target.files[0];if(!file)return;const id=++loadVersion;cancel();$('notice').textContent='Открываю изображение…';let url;
    try{
      if(file.size>160*1024*1024)throw new Error('Выберите файл размером до 160 МБ');
      url=URL.createObjectURL(file);const image=new Image();image.src=url;await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('Браузер не смог открыть изображение. Используйте PNG, JPEG, BMP или WebP.'));});
      if(id!==loadVersion)return;const w=image.naturalWidth,h=image.naturalHeight;
      if(!w||!h||w*h>16000000||w>16000||h>16000)throw new Error('Поддерживаются изображения до 16 миллионов пикселей и 16 000 пикселей по стороне');
      const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);const data=ctx.getImageData(0,0,w,h);setSource(new PixelBuffer(w,h,data.data),file.name,'Загруженное изображение. Обработка выполняется в исходном разрешении.');for(const b of $('samples').children)b.classList.remove('active');await apply();
    }catch(error){if(id===loadVersion)$('notice').textContent=error.message;}
    finally{if(url)URL.revokeObjectURL(url);}
  };
  $('apply').onclick=apply;$('cancel').onclick=cancel;
  $('reset').onclick=()=>{cancel();$('filter').value='none';$('contrast').value='linear';$('radius').value=2;$('sigma').value=1.4;$('edge').value='reflect';$('clahe-radius').value=16;$('clip').value=2;view.controls();if(source)apply();};
  for(const id of ['filter','contrast','radius','sigma','edge','clahe-radius','clip','threads'])$(id).oninput=()=>{view.controls();if(view.result)$('notice').textContent='Параметры изменены. Нажмите «Применить», чтобы обновить результат.';};
  $('channel').onchange=()=>view.plots();$('log').onchange=()=>view.plots();
  $('save').onclick=()=>{if(!view.result)return;$('after').toBlob(blob=>{if(!blob){$('notice').textContent='Не удалось сохранить PNG';return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=sourceName.replace(/\.[^.]+$/,'')+'-processed.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);},'image/png');};
  window.addEventListener('beforeunload',()=>engine.cancel());view.controls();sample('low');
})();
