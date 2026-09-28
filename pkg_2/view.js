const FileView = {
  node(id) {return document.getElementById(id);},
  bytes(value) {const units=['Б','КБ','МБ','ГБ'];let i=0;while(value>=1024&&i<3){value/=1024;i++;}return `${value.toLocaleString('ru-RU',{maximumFractionDigits:i?2:0})} ${units[i]}`;},
  number(value) {return value.toLocaleString('ru-RU',{maximumFractionDigits:2});},
  dpi(value) {return value?value.map(v=>this.number(v)).join(' × '):'Не задано';},
  stats(engine) {
    this.node('stat-total').replaceChildren(document.createTextNode(this.number(engine.completed)),Object.assign(document.createElement('small'),{textContent:` / ${this.number(engine.total)}`}));
    this.node('stat-good').textContent=this.number(engine.counts.good);this.node('stat-bad').textContent=this.number(engine.counts.bad);
    this.node('stat-time').replaceChildren(document.createTextNode(this.number(engine.elapsed/1000)),Object.assign(document.createElement('small'),{textContent:' с'}));
    this.node('progress').max=Math.max(1,engine.total);this.node('progress').value=engine.completed;
    this.node('progress-label').textContent=engine.running?`${Math.round(engine.completed/engine.total*100)}% · сканирование`:engine.completed===engine.total?'Обработка завершена':'Обработка остановлена';
    this.node('stop').disabled=!engine.running;this.node('export').disabled=engine.results.length===0;
  },
  rows(results,page,size,selected,onSelect) {
    const body=this.node('rows'),fragment=document.createDocumentFragment();
    for(const row of results.slice(page*size,(page+1)*size)) {
      const tr=document.createElement('tr');tr.tabIndex=0;tr.classList.toggle('selected',row.index===selected);tr.setAttribute('aria-selected',String(row.index===selected));
      const values=[row.name,row.format||'—',row.width?`${row.width} × ${row.height}`:'—',this.dpi(row.dpi),row.depth??'—',row.compression||'—'];
      for(let i=0;i<values.length;i++) {const td=document.createElement('td');td.textContent=values[i];td.title=i===0?row.path:String(values[i]);if(i===0&&row.warning){const warning=document.createElement('span');warning.textContent='⚠ ';warning.className='warning';warning.title=row.warning;td.prepend(warning);}tr.append(td);}
      const td=document.createElement('td'),badge=document.createElement('span');badge.className=`status ${['Файл поврежден','Ошибка чтения'].includes(row.status)?'bad':row.status==='Не поддерживается'?'unsupported':''}`;badge.textContent=row.status;badge.title=row.error||row.warning||'Структура метаданных прочитана';td.append(badge);tr.append(td);
      tr.onclick=()=>onSelect(row);tr.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onSelect(row);}};fragment.append(tr);
    }
    body.replaceChildren(fragment);this.node('empty').hidden=results.length>0;
    if(!results.length){this.node('empty').querySelector('h3').textContent=this.hasScanned?'Ничего не найдено':'Добавьте первую папку';}
    const pages=Math.max(1,Math.ceil(results.length/size));this.node('page').textContent=`${page+1} / ${pages}`;
    this.node('range').textContent=results.length?`${page*size+1}–${Math.min((page+1)*size,results.length)} из ${this.number(results.length)}`:'Нет файлов';this.node('previous').disabled=page===0;this.node('next').disabled=page>=pages-1;
  },
  detail(row,file) {
    if(this.previewURL)URL.revokeObjectURL(this.previewURL);this.previewURL=null;
    const preview=this.node('preview');preview.replaceChildren();
    this.node('detail-name').textContent=row?.name||'Изображение не выбрано';
    this.node('detail-status').textContent=row?[row.status,row.warning,row.error].filter(Boolean).join(' · '):'Основные поля и дополнительные характеристики появятся здесь.';
    const details=this.node('details');details.replaceChildren();
    if(!row){preview.textContent='Выберите изображение в таблице';return;}
    const data={'Путь':row.path,'Размер файла':this.bytes(row.size),'Прочитано для анализа':this.bytes(row.bytesRead),'Размер изображения':row.width?`${row.width} × ${row.height} px`:'—','Разрешение':this.dpi(row.dpi),'Глубина цвета':row.depth?`${row.depth} бит/пиксель`:'—',...row.details};
    for(const [key,value] of Object.entries(data)){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=value;details.append(dt,dd);}
    if(row.status!=='Готово'){preview.textContent='Предпросмотр недоступен';return;}
    if(!['JPEG','PNG','GIF','BMP'].includes(row.format)){preview.textContent='Для этого формата доступен анализ метаданных. Браузерный предпросмотр не поддерживается.';return;}
    if(row.width*row.height>40000000||row.size>100*1024*1024){preview.textContent='Предпросмотр отключён для большого изображения';return;}
    const image=document.createElement('img');image.alt=row.name;this.previewURL=URL.createObjectURL(file);image.src=this.previewURL;image.onerror=()=>{if(preview.contains(image))preview.textContent='Браузер не смог показать изображение';};preview.append(image);
  }
};
