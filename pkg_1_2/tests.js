
function runColorTests(){let total=0,passed=0,failures=[];const M=ColorModel;
 function test(name,f){total++;try{f();passed++;}catch(e){failures.push(name+': '+e.message);}}
 function near(a,b,eps=1e-7){if(a.length!==b.length||a.some((x,i)=>!Number.isFinite(x)||Math.abs(x-b[i])>eps))throw Error(JSON.stringify(a)+' ≠ '+JSON.stringify(b));}
 test('Красный → HLS',()=>near(M.rgbToHls([255,0,0]),[0,50,100]));
 test('Зелёный → HLS',()=>near(M.rgbToHls([0,255,0]),[120,50,100]));
 test('Синий → HLS',()=>near(M.rgbToHls([0,0,255]),[240,50,100]));
 test('Красный → CMYK',()=>near(M.rgbToCmyk([255,0,0]),[0,100,100,0]));
 test('Чёрный → CMYK',()=>near(M.rgbToCmyk([0,0,0]),[0,0,0,100]));
 test('Белый → CMYK',()=>near(M.rgbToCmyk([255,255,255]),[0,0,0,0]));
 test('H 360 = H 0',()=>near(M.hlsToRgb([360,50,100]),[255,0,0]));
 test('Серый → HLS',()=>near(M.rgbToHls([127.5,127.5,127.5]),[0,50,0]));
 test('GCR средний серый',()=>near(M.rgbToCmyk([127.5,127.5,127.5]),[0,0,0,50]));
 test('UCR не заменяет средние тона',()=>near(M.rgbToCmyk([127.5,127.5,127.5],'UCR'),[50,50,50,0]));
 test('UCR заменяет глубокие тени',()=>{let k=M.rgbToCmyk([25.5,25.5,25.5],'UCR')[3];if(k<=0||k>=90)throw Error('Неверная чёрная компонента');});
 test('Обрезание',()=>near(M.gamut([-10,120,300]).rgb,[0,120,255]));
 test('Масштабирование',()=>near(M.gamut([-10,120,300],'scaling').rgb,[0,130*255/310,255]));
 test('Красный → LAB D65, эталон',()=>near(M.xyzToLab(M.rgbToXyz([255,0,0],'D65'),'D65'),[53.2371,80.0901,67.2033],.001));
 for(let w of Object.keys(M.whites)){
 test('Белый XYZ '+w,()=>near(M.rgbToXyz([255,255,255],w),M.xy(M.whites[w]).map(x=>x*100)));
 test('Белый LAB '+w,()=>near(M.xyzToLab(M.rgbToXyz([255,255,255],w),w),[100,0,0]));
 test('Чёрный LAB '+w,()=>near(M.xyzToLab([0,0,0],w),[0,0,0]));
 }
 let seed=12345;const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296*255;};
 for(let i=0;i<150;i++){let rgb=[rand(),rand(),rand()];test('HLS roundtrip '+i,()=>near(M.hlsToRgb(M.rgbToHls(rgb)),rgb));for(let method of ['UCR','GCR'])for(let s of [0,.5,1])test('CMYK '+method+' '+s+' '+i,()=>near(M.cmykToRgb(M.rgbToCmyk(rgb,method,s)),rgb));for(let w of Object.keys(M.whites))test('XYZ LAB roundtrip '+w+' '+i,()=>{let xyz=M.rgbToXyz(rgb,w);near(M.xyzToRgb(M.labToXyz(M.xyzToLab(xyz,w),w),w),rgb,1e-6);});}
 return{passed,total,failures};}
