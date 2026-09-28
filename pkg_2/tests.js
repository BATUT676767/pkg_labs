const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {parse,crc32}=require('./model.js');
const results=[];
async function test(name,run){try{await run();results.push({name,passed:true});}catch(error){results.push({name,passed:false,error:error.message});}}
const file=(bytes,name)=>new File([bytes],name);
function makeTiff({le=true,big=false,tiled=false,unit=2,cycle=false,badOffset=false,sub=false}={}) {
  const b=Buffer.alloc(1024),u16=(o,v)=>le?b.writeUInt16LE(v,o):b.writeUInt16BE(v,o),u32=(o,v)=>le?b.writeUInt32LE(v,o):b.writeUInt32BE(v,o),u64=(o,v)=>le?b.writeBigUInt64LE(BigInt(v),o):b.writeBigUInt64BE(BigInt(v),o);
  b.write(le?'II':'MM');u16(2,big?43:42);if(big){u16(4,8);u64(8,16);}else u32(4,8);
  const tags=[[256,4,1,2],[257,4,1,2],[258,3,3,500],[259,3,1,1],[262,3,1,2],[tiled?324:273,big?16:4,2,600],[277,3,1,3],[tiled?325:279,big?16:4,2,640],[282,5,1,700],[283,5,1,708],[296,3,1,unit]];
  if(sub)tags.push([34665,4,1,800]);
  const start=big?16:8,entrySize=big?20:12,countSize=big?8:2;
  (big?u64:u16)(start,tags.length);
  tags.sort((a,b)=>a[0]-b[0]).forEach(([tag,type,count,value],i)=>{
    const at=start+countSize+i*entrySize;u16(at,tag);u16(at+2,type);(big?u64:u32)(at+4,count);const p=at+(big?12:8);
    if(type===3&&count===1)u16(p,value);
    else if(big&&tag===258){u16(p,8);u16(p+2,8);u16(p+4,8);}
    else if(big&&type===5){u32(p,tag===282?601:1201);u32(p+4,2);}
    else if(big&&count===1&&type===4)u32(p,value);
    else(big?u64:u32)(p,value);
  });
  (big?u64:u32)(start+countSize+tags.length*entrySize,cycle?start:0);
  u16(500,8);u16(502,8);u16(504,8);(big?u64:u32)(600,badOffset?2000:900);(big?u64:u32)(big?608:604,906);(big?u64:u32)(640,6);(big?u64:u32)(big?648:644,6);u32(700,601);u32(704,2);u32(708,1201);u32(712,2);
  if(sub){(big?u64:u16)(800,0);(big?u64:u32)(800+countSize,0);}
  return b;
}
function pngChunk(type,bytes){const n=Buffer.alloc(4);n.writeUInt32BE(bytes.length);const payload=Buffer.concat([Buffer.from(type),bytes]),crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(payload));return Buffer.concat([n,payload,crc]);}
function pngSample(){const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(3,0);ihdr.writeUInt32BE(2,4);ihdr[8]=8;ihdr[9]=6;const phys=Buffer.alloc(9);phys.writeUInt32BE(10000,0);phys.writeUInt32BE(20000,4);phys[8]=1;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),pngChunk('IHDR',ihdr),pngChunk('pHYs',phys),pngChunk('IDAT',require('node:zlib').deflateSync(Buffer.alloc(26))),pngChunk('IEND',Buffer.alloc(0))]);}
function bmpRLE(depth){const palette=2**depth*4,offset=54+palette,encoded=Buffer.from([2,depth===8?1:0x11,0,0,0,1]),b=Buffer.alloc(offset+encoded.length);b.write('BM');b.writeUInt32LE(b.length,2);b.writeUInt32LE(offset,10);b.writeUInt32LE(40,14);b.writeInt32LE(2,18);b.writeInt32LE(1,22);b.writeUInt16LE(1,26);b.writeUInt16LE(depth,28);b.writeUInt32LE(depth===8?1:2,30);b.writeUInt32LE(encoded.length,34);encoded.copy(b,offset);return b;}
async function main(){
  for(const le of [true,false])for(const big of [true,false])for(const tiled of [true,false])await test(`TIFF ${le?'II':'MM'} ${big?'64':'32'} ${tiled?'tiles':'strips'}`,async()=>{const r=await parse(file(makeTiff({le,big,tiled,sub:true}),'image.tif'));assert.equal(r.status,'Готово',r.error);assert.equal(r.depth,24);assert.deepEqual(r.dpi,[300.5,600.5]);assert.equal(r.details['IFD всего'],2);});
  await test('TIFF сантиметры',async()=>{const r=await parse(file(makeTiff({unit:3}),'cm.tif'));assert.deepEqual(r.dpi,[300.5*2.54,600.5*2.54]);});
  await test('TIFF относительное разрешение',async()=>{assert.equal((await parse(file(makeTiff({unit:1}),'ratio.tif'))).dpi,null);});
  for(const settings of [{cycle:true},{badOffset:true}])await test('TIFF повреждение '+JSON.stringify(settings),async()=>assert.equal((await parse(file(makeTiff(settings),'bad.tif'))).status,'Файл поврежден'));
  for(const depth of [4,8])await test(`BMP RLE${depth}`,async()=>{const r=await parse(file(bmpRLE(depth),'rle.bmp'));assert.equal(r.status,'Готово',r.error);assert.equal(r.compression,`BI_RLE${depth}`);assert.equal(r.depth,depth);});
  await test('PNG RGBA и DPI',async()=>{const r=await parse(file(pngSample(),'rgba.png'));assert.equal(r.status,'Готово',r.error);assert.equal(r.depth,32);assert.deepEqual(r.dpi,[254,508]);});
  await test('PNG без IEND',async()=>assert.equal((await parse(file(pngSample().subarray(0,-12),'bad.png'))).status,'Файл поврежден'));
  await test('PNG неверная CRC',async()=>{const b=pngSample();b[32]^=1;assert.equal((await parse(file(b,'bad.png'))).status,'Файл поврежден');});
  await test('PNG огромный чанк',async()=>{const b=pngSample();b.writeUInt32BE(0xffffffff,33);assert.equal((await parse(file(b,'bad.png'))).status,'Файл поврежден');});
  await test('Текст с расширением JPG',async()=>assert.equal((await parse(file('hello','text.jpg'))).status,'Файл поврежден'));
  await test('Неподдерживаемый текст',async()=>assert.equal((await parse(file('hello','text.txt'))).status,'Не поддерживается'));
  await test('Пустой файл',async()=>assert.equal((await parse(file('','empty.png'))).status,'Файл поврежден'));
  await test('PNG под расширением JPG',async()=>{const r=await parse(file(pngSample(),'image.jpg'));assert.equal(r.format,'PNG');assert.ok(r.warning);});
  const fixtures=path.join(__dirname,'fixtures');
  if(fs.existsSync(fixtures)) {
    for(const e of JSON.parse(fs.readFileSync(path.join(fixtures,'expected.json'),'utf8')))await test(`Эталон ${e.file}`,async()=>{const r=await parse(file(fs.readFileSync(path.join(fixtures,e.file)),e.file));assert.equal(r.status,'Готово',r.error);assert.equal(r.width,e.width);assert.equal(r.height,e.height);if(e.dpi)for(let i=0;i<2;i++)assert.ok(Math.abs(r.dpi[i]-e.dpi[i])<.03,`DPI ${r.dpi} != ${e.dpi}`);});
    for(const name of fs.readdirSync(fixtures).filter(n=>n.startsWith('cut-')))await test(`Обрезанный ${name}`,async()=>assert.equal((await parse(file(fs.readFileSync(path.join(fixtures,name)),name))).status,'Файл поврежден'));
    const jpg=fs.readFileSync(path.join(fixtures,'RGB.jpeg'));
    await test('JPEG Exif важнее JFIF',async()=>{const payload=Buffer.concat([Buffer.from('Exif\0\0'),makeTiff()]),length=Buffer.alloc(2);length.writeUInt16BE(payload.length+2);const data=Buffer.concat([jpg.subarray(0,2),Buffer.from([255,225]),length,payload,jpg.subarray(2)]);const r=await parse(file(data,'exif.jpg'));assert.equal(r.status,'Готово',r.error);assert.deepEqual(r.dpi,[300.5,600.5]);});
    await test('JPEG ленивое чтение 3 МБ',async()=>{const large=Buffer.concat([jpg.subarray(0,-2),Buffer.alloc(3*1024*1024),jpg.subarray(-2)]),r=await parse(file(large,'large.jpg'));assert.equal(r.status,'Готово',r.error);assert.ok(r.bytesRead<10000);});
    await test('Многостраничный TIFF',async()=>assert.equal((await parse(file(fs.readFileSync(path.join(fixtures,'multipage.tif')),'multi.tif'))).details['Изображений / SubIFD'],2));
  }
  if(process.argv[2])for(const name of fs.readdirSync(process.argv[2]).filter(n=>/\.bmp$/i.test(n)))await test(`Проверочная папка ${name}`,async()=>{const b=fs.readFileSync(path.join(process.argv[2],name)),r=await parse(file(b,name));assert.equal(r.status,'Готово',r.error);assert.equal(r.width,b.readInt32LE(18));assert.equal(r.height,Math.abs(b.readInt32LE(22)));assert.equal(r.depth,8);assert.equal(r.dpi,null);assert.equal(r.compression,'BI_RGB — без сжатия');assert.ok(r.bytesRead<=4096);});
  for(let i=0;i<80;i++)await test(`Обрезанный TIFF ${i}`,async()=>assert.equal((await parse(file(makeTiff().subarray(0,i),'short.tif'))).status,'Файл поврежден'));
  const report={total:results.length,passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed),checks:results};fs.writeFileSync(path.join(__dirname,'test-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({total:report.total,passed:report.passed,failed:report.failed},null,2));if(report.failed.length)process.exitCode=1;
}
main().catch(error=>{console.error(error);process.exitCode=1;});
