const SampleImages={
  items:[['low','Малый контраст','Яркости сжаты в диапазон 95–150. Сравните растяжение и эквализацию.'],['color','Цветовые полосы','Малоконтрастная цветная сцена. Сравните RGB и HSV: независимые каналы могут изменить оттенок.'],['noise','Гауссов шум','Шум на плавных областях и тонких деталях. Сравните бокс-фильтр и Гаусс.'],['impulse','Импульсный шум','Соль и перец: линейное сглаживание ослабляет выбросы, но размывает детали.'],['uneven','Неравномерный свет','Локальные детали на тёмном и светлом фоне. Сравните глобальную эквализацию и CLAHE.'],['edges','Границы и детали','Контрастные полосы и объекты касаются границ. Сравните Reflect и Clamp.'],['clean','Чистый эталон','Исходная сцена без шума для оценки потери деталей при сглаживании.']],
  make(kind,width=640,height=400){
    const data=new Uint8ClampedArray(width*height*4);let seed=2302;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return (seed+.5)/4294967296;};
    const clamp=x=>Math.max(0,Math.min(255,Math.round(x)));
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const u=x/width,v=y/height,p=(y*width+x)*4;
      let value=45+145*u+18*Math.sin(v*10),r,g,b;
      if(u>.13&&u<.42&&v>.22&&v<.77)value=90+70*v;
      if((u-.68)**2+(v-.47)**2<.14**2)value=220;
      if(v>.83&&v<.88&&u>.08&&u<.92)value=(Math.floor(u*65)%2)?235:20;
      if(u>.48&&u<.51&&v>.1&&v<.9)value=30;
      r=value;g=value;b=value;
      if(kind==='low')r=g=b=95+value*55/255;
      if(kind==='color'){const band=Math.floor(u*6),palette=[[180,85,90],[150,145,65],[70,165,115],[75,130,170],[120,85,165],[170,95,140]];[r,g,b]=palette[Math.min(5,band)].map(c=>75+c*(.25+.35*v));if((u-.65)**2+(v-.42)**2<.08**2){r+=25;g+=12;b+=5;}}
      if(kind==='noise'){const noise=18*Math.sqrt(-2*Math.log(random()))*Math.cos(2*Math.PI*random());r+=noise;g+=noise;b+=noise;}
      if(kind==='impulse'){const q=random();if(q<.045)r=g=b=0;else if(q>.955)r=g=b=255;}
      if(kind==='uneven'){let detail=(Math.floor(u*22)+Math.floor(v*14))%2?12:-12;if((u-.5)**2+(v-.5)**2<.035)detail+=22;r=g=b=30+170*u+detail+8*Math.sin(v*20);}
      if(kind==='edges'){r=g=b=30+190*(Math.floor(u*24)%2);if(u<.04||v<.04)r=g=b=255;if(v>.7)r=g=b=20+200*(Math.floor(u*80)%2);}
      data[p]=clamp(r);data[p+1]=clamp(g);data[p+2]=clamp(b);data[p+3]=255;
    }
    return new PixelBuffer(width,height,data);
  }
};
if(typeof module!=='undefined')module.exports=SampleImages;
