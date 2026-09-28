function installMetadata() {
  const fail = message => { throw new Error(message); };
  const check = (value, message) => { if (!value) fail(message); };
  const text = bytes => String.fromCharCode(...bytes);
  class Reader {
    constructor(file) { this.file = file; this.size = file.size; this.bytesRead = 0; this.cache = new Map(); this.operations = 0; }
    range(offset, length) {
      check(Number.isSafeInteger(offset) && Number.isSafeInteger(length) && offset >= 0 && length >= 0 && offset <= this.size - length, 'Данные выходят за границы файла');
    }
    async read(offset, length) {
      this.range(offset, length);
      check(++this.operations < 2000000, 'Превышен предел сложности структуры');
      if (!length) return new Uint8Array();
      if (length > 4096) {
        const out = new Uint8Array(length);
        for (let i = 0; i < length; i += 4096) out.set(await this.read(offset + i, Math.min(4096, length - i)), i);
        return out;
      }
      const block = Math.floor(offset / 4096) * 4096;
      if (offset + length > block + 4096) {
        const first = 4096 - offset + block;
        const out = new Uint8Array(length);
        out.set(await this.read(offset, first));
        out.set(await this.read(offset + first, length - first), first);
        return out;
      }
      let bytes = this.cache.get(block);
      if (!bytes) {
        try {
          bytes = new Uint8Array(await this.file.slice(block, Math.min(block + 4096, this.size)).arrayBuffer());
        } catch (error) {
          const failure = new Error(`Не удалось получить доступ к файлу: ${error.message || error.name}`);
          failure.name = 'FileReadError';
          throw failure;
        }
        check(bytes.length === Math.min(4096, this.size - block), 'Не удалось прочитать файл полностью');
        this.bytesRead += bytes.length;
        if (this.cache.size >= 16) this.cache.delete(this.cache.keys().next().value);
        this.cache.set(block, bytes);
      }
      return bytes.subarray(offset - block, offset - block + length);
    }
    async view(offset, length) { const b = await this.read(offset, length); return new DataView(b.buffer, b.byteOffset, b.byteLength); }
  }
  const dimension = (width, height) => check(Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0, 'Некорректные размеры изображения');
  const compressionNames = {1:'Без сжатия',2:'CCITT RLE',3:'CCITT Group 3',4:'CCITT Group 4',5:'LZW',6:'JPEG (старый TIFF)',7:'JPEG',8:'Deflate',32773:'PackBits',32946:'Deflate'};
  async function tiff(reader, base = 0, limit = reader.size, embedded = false) {
    const read = async (at, n) => { check(at >= 0 && at + n <= limit - base, 'TIFF: смещение за границами блока'); return reader.view(base + at, n); };
    const h = await read(0, 8);
    const order = h.getUint16(0);
    check(order === 0x4949 || order === 0x4d4d, 'TIFF: неизвестный порядок байтов');
    const le = order === 0x4949, version = h.getUint16(2, le), big = version === 43;
    check(version === 42 || big, 'TIFF: неверная версия');
    const safe64 = (v, at) => { const n = v.getBigUint64(at, le); check(n <= BigInt(Number.MAX_SAFE_INTEGER), 'TIFF: слишком большое 64-битное значение'); return Number(n); };
    let start;
    if (big) { const b = await read(0, 16); check(b.getUint16(4, le) === 8 && b.getUint16(6, le) === 0, 'BigTIFF: неверный заголовок'); start = safe64(b, 8); }
    else start = h.getUint32(4, le);
    check(start > 0, 'TIFF: отсутствует IFD');
    const sizes = {1:1,2:1,3:2,4:4,5:8,6:1,7:1,8:2,9:4,10:8,11:4,12:8,13:4,16:8,17:8,18:8};
    const wanted = new Set([256,257,258,259,262,273,277,278,279,282,283,284,296,320,322,323,324,325,330,338,34665,34853,40965]);
    const pending = [{offset:start, image:!embedded}], visited = new Set(), pages = [], all = [];
    while (pending.length) {
      check(visited.size < 4096, 'TIFF: слишком много IFD');
      const {offset, image} = pending.shift();
      check(!visited.has(offset), 'TIFF: циклическая или повторная ссылка IFD'); visited.add(offset);
      const countSize = big ? 8 : 2, entrySize = big ? 20 : 12, inline = big ? 8 : 4;
      const countData = await read(offset, countSize), count = big ? safe64(countData, 0) : countData.getUint16(0, le);
      check(count <= 65536, 'TIFF: слишком много тегов');
      const tableEnd = offset + countSize + count * entrySize;
      await read(tableEnd, big ? 8 : 4);
      const tags = new Map();
      for (let i = 0; i < count; i++) {
        const at = offset + countSize + i * entrySize, e = await read(at, entrySize);
        const tag = e.getUint16(0, le), type = e.getUint16(2, le), n = big ? safe64(e, 4) : e.getUint32(4, le);
        const size = sizes[type];
        if (!size) { check(!wanted.has(tag), 'TIFF: неизвестный тип обязательного тега'); continue; }
        const length = n * size;
        check(Number.isSafeInteger(length), 'TIFF: переполнение размера тега');
        const valuePos = big ? 12 : 8;
        const dataOffset = length <= inline ? at + valuePos : (big ? safe64(e, valuePos) : e.getUint32(valuePos, le));
        check(dataOffset + length <= limit - base, 'TIFF: значение тега выходит за границы');
        if (!wanted.has(tag)) continue;
        check(n <= 1000000, 'TIFF: слишком большой массив тега');
        const values = [];
        for (let j = 0; j < n; j++) {
          const v = await read(dataOffset + j * size, size);
          let value;
          if ([1,2,7].includes(type)) value = v.getUint8(0);
          else if (type === 6) value = v.getInt8(0);
          else if (type === 3) value = v.getUint16(0,le);
          else if (type === 8) value = v.getInt16(0,le);
          else if ([4,13].includes(type)) value = v.getUint32(0,le);
          else if (type === 9) value = v.getInt32(0,le);
          else if ([5,10].includes(type)) { const get = type === 5 ? 'getUint32' : 'getInt32'; const denominator = v[get](4,le); check(denominator !== 0, 'TIFF: нулевой знаменатель RATIONAL'); value = v[get](0,le) / denominator; }
          else if (type === 11) value = v.getFloat32(0,le);
          else if (type === 12) value = v.getFloat64(0,le);
          else if (type === 17) { const signed = v.getBigInt64(0,le); check(signed <= BigInt(Number.MAX_SAFE_INTEGER) && signed >= BigInt(Number.MIN_SAFE_INTEGER), 'TIFF: переполнение SLONG8'); value = Number(signed); }
          else value = safe64(v,0);
          check(Number.isFinite(value), 'TIFF: нечисловое значение тега'); values.push(value);
        }
        check(!tags.has(tag), 'TIFF: повторный тег'); tags.set(tag,values);
      }
      const scalar = (tag, fallback) => tags.get(tag)?.[0] ?? fallback;
      const unit = scalar(296,2), factor = unit === 2 ? 1 : unit === 3 ? 2.54 : null;
      const rx = scalar(282,0), ry = scalar(283,0);
      const page = {width:scalar(256,0),height:scalar(257,0),dpi:factor && rx > 0 && ry > 0 ? [rx*factor,ry*factor] : null};
      if (image) {
        dimension(page.width,page.height);
        const samples = scalar(277,1), bits = tags.get(258) || [1];
        check(samples > 0 && samples <= 64 && bits.length === samples && bits.every(b => Number.isInteger(b) && b > 0 && b <= 64), 'TIFF: неверная глубина каналов');
        page.depth = bits.reduce((a,b)=>a+b,0);
        page.compression = compressionNames[scalar(259,1)] || `TIFF, код ${scalar(259,1)}`;
        page.palette = tags.has(320) ? tags.get(320).length / 3 : 0;
        page.channels = samples;
        let hasData = false;
        for (const [ot,ct] of [[273,279],[324,325]]) {
          if (!tags.has(ot) && !tags.has(ct)) continue;
          const offsets = tags.get(ot), counts = tags.get(ct);
          check(offsets && counts && offsets.length > 0 && offsets.length === counts.length, 'TIFF: некорректные массивы полос/тайлов');
          for (let i=0;i<offsets.length;i++) { check(counts[i] > 0, 'TIFF: пустая полоса/тайл'); check(offsets[i] >= 0 && offsets[i] + counts[i] <= limit-base, 'TIFF: обрезана полоса/тайл'); }
          hasData = true;
        }
        check(hasData, 'TIFF: отсутствуют полосы или тайлы');
        pages.push(page);
      }
      all.push(page);
      for (const tag of [330,34665,34853,40965]) for (const value of tags.get(tag) || []) if (value) pending.push({offset:value,image:tag === 330 && !embedded});
      const nextData = await read(tableEnd,big?8:4), next = big ? safe64(nextData,0) : nextData.getUint32(0,le);
      if (next) pending.push({offset:next,image:!embedded && image});
    }
    if (embedded) return all.find(p=>p.dpi)?.dpi || null;
    check(pages.length, 'TIFF: нет изображений');
    return {...pages[0],format:big?'BigTIFF':'TIFF',details:{'Порядок байтов':le?'Little-endian (II)':'Big-endian (MM)','Изображений / SubIFD':pages.length,'IFD всего':visited.size,'Страницы':pages.map((p,i)=>`${i+1}: ${p.width} × ${p.height}, ${p.depth} бит, ${p.compression}`).join('; '),'Цветов в палитре':pages[0].palette || 'Нет'}};
  }
  async function bmp(r) {
    const h = await r.view(0,26), fileSize = h.getUint32(2,true), pixelOffset = h.getUint32(10,true), dib = h.getUint32(14,true);
    check(fileSize === 0 || fileSize <= r.size, 'BMP: размер файла меньше заявленного');
    check([12,40,52,56,64,108,124].includes(dib), 'BMP: неподдерживаемый DIB-заголовок');
    const d = await r.view(14,dib), core = dib === 12;
    const width = core ? d.getUint16(4,true) : d.getInt32(4,true), rawHeight = core ? d.getUint16(6,true) : d.getInt32(8,true), height = Math.abs(rawHeight);
    dimension(width,height);
    const planes = d.getUint16(core?8:12,true), depth = d.getUint16(core?10:14,true), code = core?0:d.getUint32(16,true);
    check(planes === 1 && [1,2,4,8,16,24,32,64].includes(depth), 'BMP: некорректные плоскости или глубина');
    const palette = depth <= 8 ? (core?2**depth:d.getUint32(32,true)||2**depth) : (core?0:d.getUint32(32,true));
    check(palette <= 2**Math.min(depth,24), 'BMP: неверный размер палитры');
    const masks = dib === 40 && [3,6].includes(code) ? (code===6?16:12) : 0;
    check(pixelOffset >= 14+dib+masks+palette*(core?3:4) && pixelOffset < r.size, 'BMP: неверное смещение пикселей/палитры');
    const imageSize = core?0:d.getUint32(20,true), dataSize = [0,3,6].includes(code) ? Math.ceil(width*depth/32)*4*height : imageSize;
    check(pixelOffset + Math.max(dataSize,imageSize) <= r.size, 'BMP: обрезаны пиксельные данные');
    if (fileSize) check(pixelOffset + Math.max(dataSize,imageSize) <= fileSize, 'BMP: противоречивый размер файла');
    check(code !== 1 || depth === 8, 'BMP: RLE8 требует 8 бит'); check(code !== 2 || depth === 4, 'BMP: RLE4 требует 4 бита');
    const x = core?0:d.getInt32(24,true), y = core?0:d.getInt32(28,true);
    return {format:'BMP',width,height,depth,dpi:x>0&&y>0?[x*.0254,y*.0254]:null,compression:({0:'BI_RGB — без сжатия',1:'BI_RLE8',2:'BI_RLE4',3:dib===64?'Huffman 1D':'BI_BITFIELDS',4:dib===64?'RLE24':'BI_JPEG',5:'BI_PNG',6:'BI_ALPHABITFIELDS'})[code]||`BMP, код ${code}`,details:{'DIB-заголовок':`${dib} байт`,'Цветов в палитре':palette,'Порядок строк':rawHeight<0?'Сверху вниз':'Снизу вверх','Смещение пикселей':pixelOffset}};
  }
  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const b of bytes) { crc ^= b; for(let i=0;i<8;i++) crc = (crc>>>1)^((crc&1)?0xedb88320:0); }
    return (crc^0xffffffff)>>>0;
  }
  async function png(r) {
    let at=8, result, idat=false, ended=false, palette=0, chunks=0, idatEnded=false;
    while (at<r.size) {
      check(++chunks<1000000,'PNG: слишком много чанков');
      const h=await r.view(at,8), n=h.getUint32(0), type=text(await r.read(at+4,4));
      check(/^[A-Za-z]{4}$/.test(type),'PNG: неверный тип чанка'); r.range(at,n+12);
      check(result || type==='IHDR','PNG: первый чанк должен быть IHDR');
      if (type==='IHDR') {
        check(!result && n===13,'PNG: неверный IHDR'); const d=await r.view(at+8,13);
        const width=d.getUint32(0),height=d.getUint32(4),bits=d.getUint8(8),color=d.getUint8(9),channels=({0:1,2:3,3:1,4:2,6:4})[color];
        dimension(width,height);
        check(({0:[1,2,4,8,16],2:[8,16],3:[1,2,4,8],4:[8,16],6:[8,16]})[color]?.includes(bits),'PNG: неверная глубина или тип цвета');
        check(d.getUint8(10)===0&&d.getUint8(11)===0&&d.getUint8(12)<=1,'PNG: неизвестное сжатие, фильтрация или чересстрочность');
        result={format:'PNG',width,height,depth:bits*channels,dpi:null,compression:'Deflate',color,bits,details:{'Бит на канал / индекс':bits,'Тип цвета':`${color} — ${({0:'Оттенки серого',2:'RGB',3:'Палитра',4:'Серый + альфа',6:'RGBA'})[color]}`,'Метод фильтрации':'0 — адаптивный (None, Sub, Up, Average, Paeth)','Чересстрочность':d.getUint8(12)?'Adam7':'Нет'}};
      } else if(type==='pHYs') {
        check(n===9&&!idat,'PNG: неверный pHYs'); const d=await r.view(at+8,9), x=d.getUint32(0),y=d.getUint32(4),u=d.getUint8(8);
        check(u<=1,'PNG: неверная единица разрешения'); if(u===1&&x>0&&y>0) result.dpi=[x*.0254,y*.0254];
      } else if(type==='PLTE') { check(!idat&&n>0&&n%3===0&&n<=768&&!palette,'PNG: неверная палитра'); palette=n/3; }
      else if(type==='IDAT') { check(!idatEnded,'PNG: нарушен порядок IDAT'); idat=true; }
      else if(type==='IEND') { check(n===0&&idat,'PNG: неверный IEND или отсутствует IDAT'); ended=true; }
      else if (type[0]===type[0].toUpperCase()) fail(`PNG: неизвестный критический чанк ${type}`);
      if(idat && type!=='IDAT') idatEnded=true;
      if(['IHDR','pHYs','PLTE','IEND'].includes(type)) {
        const stored=(await r.view(at+8+n,4)).getUint32(0);
        check(crc32(await r.read(at+4,n+4))===stored,`PNG: неверная CRC ${type}`);
      }
      at+=n+12; if(ended) break;
    }
    check(ended,'PNG: отсутствует IEND'); check(at===r.size,'PNG: данные после IEND');
    check(result.color!==3||(palette>0&&palette<=2**result.bits),'PNG: отсутствует или неверна индексированная палитра');
    result.details['Цветов в палитре']=palette||'Нет'; return result;
  }
  async function gif(r) {
    const d=await r.view(0,13), width=d.getUint16(6,true),height=d.getUint16(8,true),packed=d.getUint8(10),globalPalette=packed&128?2**((packed&7)+1):0;
    dimension(width,height); let at=13+globalPalette*3,frames=0,depth=0,localMax=0,ended=false;
    r.range(0,at);
    async function blocks() { while(true) { const n=(await r.read(at++,1))[0]; if(!n)break; r.range(at,n);at+=n; } }
    while(at<r.size) {
      const type=(await r.read(at++,1))[0];
      if(type===0x3b){ended=true;break;}
      if(type===0x21){await r.read(at++,1);await blocks();continue;}
      check(type===0x2c,'GIF: неизвестный блок'); const frame=await r.view(at,9);at+=9;
      const fw=frame.getUint16(4,true),fh=frame.getUint16(6,true),flags=frame.getUint8(8); dimension(fw,fh);
      check(frame.getUint16(0,true)+fw<=width&&frame.getUint16(2,true)+fh<=height,'GIF: кадр выходит за логический экран');
      const local=flags&128?2**((flags&7)+1):0,colors=local||globalPalette;
      check(colors>0,'GIF: отсутствует палитра'); localMax=Math.max(localMax,local);depth=Math.max(depth,Math.log2(colors));
      r.range(at,local*3);at+=local*3; const lzw=(await r.read(at++,1))[0]; check(lzw>=2&&lzw<=8,'GIF: неверный размер кода LZW');
      await blocks();frames++;
    }
    check(ended&&frames>0,'GIF: отсутствует завершающий блок или кадры');
    return {format:'GIF',width,height,depth,dpi:null,compression:'LZW',details:{'Кадров':frames,'Цветов в глобальной палитре':globalPalette,'Максимальная локальная палитра':localMax,'Цветовая разрешающая способность':((packed>>4)&7)+1,'DPI':'В формате не хранится'}};
  }
  async function pcx(r) {
    const d=await r.view(0,128),version=d.getUint8(1),encoding=d.getUint8(2),bits=d.getUint8(3),planes=d.getUint8(65),line=d.getUint16(66,true);
    check([0,2,3,4,5].includes(version)&&[0,1].includes(encoding)&&[1,2,4,8].includes(bits)&&planes>0&&planes<=4,'PCX: неверный заголовок');
    const width=d.getUint16(8,true)-d.getUint16(4,true)+1,height=d.getUint16(10,true)-d.getUint16(6,true)+1; dimension(width,height);
    check(line>=Math.ceil(width*bits/8)&&line%2===0,'PCX: неверная длина строки');
    let end=r.size,palette=bits*planes<=4?16:0;
    if(bits===8&&planes===1&&version===5) {
      check(r.size>=897&&(await r.read(r.size-769,1))[0]===12,'PCX: отсутствует 256-цветная палитра'); end-=769;palette=256;
    }
    const decoded=line*planes*height,encoded=end-128;
    check(encoded>0&&encoded>=(encoding?Math.floor(decoded/63)*2+Math.min(2,decoded%63):decoded),'PCX: обрезаны пиксельные данные');
    if(encoding) {
      let produced=0,pending=0;
      for(let offset=128;offset<end;offset+=65536) {
        const block=await r.read(offset,Math.min(65536,end-offset));
        for(const value of block) {
          if(pending){produced+=pending;pending=0;}
          else if((value&192)===192){pending=value&63;check(pending>0,'PCX: нулевая серия RLE');}
          else produced++;
          check(produced<=decoded,'PCX: RLE превышает размер изображения');
        }
      }
      check(!pending&&produced===decoded,'PCX: обрезан поток RLE');
    }
    const x=d.getUint16(12,true),y=d.getUint16(14,true);
    return {format:'PCX',width,height,depth:bits*planes,dpi:x>0&&y>0?[x,y]:null,compression:encoding?'RLE':'Без сжатия',details:{'Версия':version,'Бит на плоскость':bits,'Плоскостей':planes,'Байт строки на плоскость':line,'Цветов в палитре':palette||'Нет'}};
  }
  async function jpeg(r) {
    check(r.size>=4,'JPEG: обрезанный файл'); const tail=await r.read(r.size-2,2);
    check(tail[0]===255&&tail[1]===217,'JPEG: отсутствует EOI (FF D9)');
    let at=2,result=null,dpi=null,exifDpi=null,quant=[],sos=false,segments=0;
    const sof=new Set([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf]);
    while(at<r.size-2) {
      check(++segments<100000,'JPEG: слишком много сегментов');
      check((await r.read(at++,1))[0]===255,'JPEG: неверный маркер');
      let marker; do {marker=(await r.read(at++,1))[0];} while(marker===255);
      check(marker!==0&&marker!==0xd8&&marker!==0xd9,'JPEG: неожиданный маркер');
      if(marker===1||(marker>=0xd0&&marker<=0xd7))continue;
      const length=(await r.view(at,2)).getUint16(0); check(length>=2,'JPEG: неверная длина сегмента');r.range(at,length);
      const start=at+2,n=length-2;
      if(sof.has(marker)) {
        check(n>=6,'JPEG: обрезан SOF');const d=await r.view(start,6),bits=d.getUint8(0),height=d.getUint16(1),width=d.getUint16(3),channels=d.getUint8(5);
        dimension(width,height);check(bits>0&&bits<=16&&channels>0&&n===6+channels*3,'JPEG: неверный SOF');
        result={format:'JPEG',width,height,depth:bits*channels,compression:[0xc3,0xc7,0xcb,0xcf].includes(marker)?'JPEG lossless':([0xc2,0xc6,0xca,0xce].includes(marker)?'JPEG progressive':'JPEG sequential'),details:{'Бит на компоненту':bits,'Компонент':channels,'SOF':`FF ${marker.toString(16).toUpperCase()}`}};
      } else if(marker===0xe0&&n>=14&&text(await r.read(start,5))==='JFIF\0') {
        const d=await r.view(start,14),unit=d.getUint8(7),x=d.getUint16(8),y=d.getUint16(10);
        if((unit===1||unit===2)&&x>0&&y>0)dpi=[x*(unit===2?2.54:1),y*(unit===2?2.54:1)];
      } else if(marker===0xe1&&n>=14&&text(await r.read(start,6))==='Exif\0\0') exifDpi=await tiff(r,start+6,at+length,true);
      else if(marker===0xdb) {
        let p=start;
        while(p<at+length){const q=(await r.read(p++,1))[0],precision=q>>4,id=q&15;check(precision<=1&&id<=3,'JPEG: неверная DQT'); const size=64*(precision+1);check(p+size<=at+length,'JPEG: обрезана DQT');const d=await r.view(p,size); const values=Array.from({length:64},(_,i)=>precision?d.getUint16(i*2):d.getUint8(i));check(values.every(v=>v>0),'JPEG: нулевая квантовка');quant.push(`Таблица ${id} (${precision?16:8} бит), zigzag: ${values.join(', ')}`);p+=size;}
      } else if(marker===0xda) {
        check(result&&n>=4,'JPEG: SOS без SOF');const count=(await r.read(start,1))[0];check(count>0&&n===1+count*2+3,'JPEG: неверный SOS');sos=true;break;
      }
      at+=length;
    }
    check(result&&sos,'JPEG: отсутствует SOF или SOS');result.dpi=exifDpi||dpi;
    result.details['Источник DPI']=exifDpi?'Exif IFD':dpi?'JFIF':'Не задан';result.details['Матрицы квантования']=quant.join('\n')||'Не заданы';return result;
  }
  async function parse(file) {
    const r=new Reader(file),base={name:file.name||'Без имени',path:file.webkitRelativePath||file.name||'',size:file.size};
    try {
      const b=await r.read(0,Math.min(16,r.size));let parser;
      if(b.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v)) parser=png;
      else if(b[0]===255&&b[1]===216)parser=jpeg;
      else if(['GIF87a','GIF89a'].includes(text(b.subarray(0,6))))parser=gif;
      else if(b[0]===66&&b[1]===77)parser=bmp;
      else if((b[0]===73&&b[1]===73)||(b[0]===77&&b[1]===77))parser=tiff;
      else if(b[0]===10)parser=pcx;
      else {
        const ext=(base.name.split('.').pop()||'').toLowerCase();
        return {...base,status:/^(jpe?g|gif|tiff?|bmp|png|pcx)$/.test(ext)?'Файл поврежден':'Не поддерживается',error:'Сигнатура не соответствует поддерживаемым форматам',bytesRead:r.bytesRead};
      }
      const data=await parser(r),extension=(base.name.split('.').pop()||'').toLowerCase(),extensions={JPEG:['jpg','jpeg','jpe'],TIFF:['tif','tiff'],BigTIFF:['tif','tiff','btf'],BMP:['bmp','dib'],PNG:['png'],GIF:['gif'],PCX:['pcx']};
      return {...base,...data,status:'Готово',warning:extensions[data.format].includes(extension)?'':'Расширение не соответствует сигнатуре',bytesRead:r.bytesRead};
    } catch(error) {return {...base,status:error.name==='FileReadError'?'Ошибка чтения':'Файл поврежден',error:error.message||'Ошибка чтения',bytesRead:r.bytesRead};}
    finally {r.cache.clear();}
  }
  globalThis.Metadata={parse,Reader,crc32};
}
installMetadata();
if(typeof module!=='undefined') module.exports={...globalThis.Metadata,installMetadata};
