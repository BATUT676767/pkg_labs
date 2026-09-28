(() => {
  const view=FileView,$=id=>view.node(id),size=100;
  let page=0,selected=null,filtered=[],dirty=true,sortKey='name',direction=1,lastRender=0,frame=null,enumeration=0;
  const collator=new Intl.Collator('ru',{numeric:true,sensitivity:'base'});
  const engine=new ScanEngine(state=>{dirty=true;view.stats(state);if(state.error)$('notice').textContent=state.error;schedule(!state.running);});
  function render() {
    frame=null;lastRender=performance.now();
    if(dirty){const query=$('search').value.trim().toLocaleLowerCase(),format=$('format').value,status=$('status').value;
      filtered=engine.results.filter(row=>(!query||row.path.toLocaleLowerCase().includes(query))&&(!format||row.format===format||(!row.format&&({JPEG:/\.jpe?g$/i,PNG:/\.png$/i,GIF:/\.gif$/i,TIFF:/\.tiff?$/i,BigTIFF:/\.btf$/i,BMP:/\.bmp$/i,PCX:/\.pcx$/i})[format]?.test(row.name)))&&(!status||row.status===status));
      filtered.sort((a,b)=>direction*(typeof a[sortKey]==='number'&&typeof b[sortKey]==='number'?a[sortKey]-b[sortKey]:collator.compare(String(a[sortKey]??''),String(b[sortKey]??''))));dirty=false;
    }
    page=Math.min(page,Math.max(0,Math.ceil(filtered.length/size)-1));view.rows(filtered,page,size,selected,row=>{selected=row.index;view.detail(row,engine.files[row.index]);render();});
  }
  function schedule(immediate=false){if(frame!==null)clearTimeout(frame);frame=setTimeout(render,immediate?0:Math.max(0,350-(performance.now()-lastRender)));}
  function start(files) {
    enumeration++;$('notice').textContent='';selected=null;page=0;view.detail(null);view.hasScanned=true;
    try{engine.start(files,Number($('threads').value));}catch(error){$('notice').textContent=error.message;}
    dirty=true;schedule(true);
  }
  $('choose-folder').onclick=()=>$('folder-input').click();$('choose-files').onclick=()=>$('file-input').click();
  for(const id of ['folder-input','file-input'])$(id).onchange=event=>{const files=Array.from(event.target.files);if(files.length)start(files);};
  $('stop').onclick=()=>{enumeration++;engine.cancel();view.stats(engine);schedule(true);};
  for(const id of ['search','format','status'])$(id).addEventListener('input',()=>{dirty=true;page=0;schedule(true);});
  $('previous').onclick=()=>{page--;render();};$('next').onclick=()=>{page++;render();};
  for(const button of document.querySelectorAll('[data-sort]'))button.onclick=()=>{if(sortKey===button.dataset.sort)direction*=-1;else{sortKey=button.dataset.sort;direction=1;}dirty=true;render();};
  $('export').onclick=()=>{
    if(dirty)render();
    const quote=value=>'"'+String(value??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';
    const lines=[['Имя файла','Путь','Формат','Ширина, px','Высота, px','DPI X','DPI Y','Бит/пиксель','Сжатие','Размер файла, байт','Статус','Причина','Предупреждение'].map(quote).join(';')];
    for(const r of filtered)lines.push([r.name,r.path,r.format,r.width,r.height,r.dpi?.[0],r.dpi?.[1],r.depth,r.compression,r.size,r.status,r.error,r.warning].map(quote).join(';'));
    const url=URL.createObjectURL(new Blob(['\ufeff',lines.join('\r\n')],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='image-metadata.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  const zone=$('drop-zone');
  zone.ondragover=event=>{event.preventDefault();zone.classList.add('drag');};zone.ondragleave=()=>zone.classList.remove('drag');
  zone.ondrop=async event=>{
    event.preventDefault();zone.classList.remove('drag');
    const items=Array.from(event.dataTransfer.items),fallback=Array.from(event.dataTransfer.files),entries=items.map(item=>item.webkitGetAsEntry?.()).filter(Boolean);
    if(!entries.length){start(fallback);return;}
    const generation=++enumeration;engine.cancel();$('stop').disabled=false;$('notice').textContent='Получаю список файлов…';const files=[];
    async function visit(entry,path=''){
      if(generation!==enumeration)return;
      if(entry.isFile){const file=await new Promise((resolve,reject)=>entry.file(resolve,reject));Object.defineProperty(file,'webkitRelativePath',{value:path+file.name});files.push(file);if(files.length>100000)throw new Error('В папке более 100 000 файлов');}
      else if(entry.isDirectory){const reader=entry.createReader();while(generation===enumeration){const children=await new Promise((resolve,reject)=>reader.readEntries(resolve,reject));if(!children.length)break;for(const child of children)await visit(child,path+entry.name+'/');}}
    }
    try{for(const entry of entries)await visit(entry);if(generation===enumeration)start(files);}catch(error){if(generation===enumeration){$('notice').textContent=error.message;$('stop').disabled=true;}}
  };
  window.addEventListener('beforeunload',()=>engine.cancel());render();
})();
