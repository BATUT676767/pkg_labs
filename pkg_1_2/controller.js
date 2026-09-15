
const Controller=(()=>{
 const M=ColorModel,V=ColorView;let rgb=[27,157,146],values={},method='GCR',strength=1,white='D65',strategy='clipping',colorimetry={},rawRgb=null;
 const notice=t=>document.getElementById('notice').textContent=t||'Цвета синхронизированы.';
 const toRgb=(m,v)=>m==='RGB'?v:m==='CMYK'?M.cmykToRgb(v):M.hlsToRgb(v);
 function refresh(source,sourceValues){values={RGB:rgb.slice(),CMYK:M.rgbToCmyk(rgb,method,strength),HLS:M.rgbToHls(rgb)};if(source)values[source]=sourceValues.slice();V.render(values,toRgb,rgb);colorimetry.matrix=M.matrix(white);colorimetry.xyz=M.rgbToXyz(rgb,white);colorimetry.lab=M.xyzToLab(colorimetry.xyz,white);renderPalette();}

 function setRgb(v,msg){rawRgb=v.slice();let result=M.gamut(v,strategy);rgb=result.rgb;refresh();notice(result.changed?'Цвет вне sRGB: применено '+(strategy==='clipping'?'обрезание каналов.':'пропорциональное масштабирование каналов.'):msg);}
 V.build();
 document.querySelectorAll('[data-m]').forEach(el=>{el.addEventListener('input',()=>{if(el.value.trim()===''||!Number.isFinite(el.valueAsNumber)){notice('Введите конечное число. Последний корректный цвет сохранён.');return;}let m=el.dataset.m,i=+el.dataset.i,[,lo,hi]=V.specs[m][i],raw=el.valueAsNumber;let v=values[m].slice();if(m==='RGB'){v[i]=raw;setRgb(v);return;}rawRgb=null;v[i]=M.clamp(raw,lo,hi);rgb=toRgb(m,v);refresh(m,v);notice(raw!==v[i]?`Компонента ${V.specs[m][i][0]} ограничена диапазоном ${lo}–${hi}.`:null);});el.addEventListener('change',()=>{el.value=+values[el.dataset.m][+el.dataset.i].toFixed(3);});el.addEventListener('blur',()=>{el.value=+values[el.dataset.m][+el.dataset.i].toFixed(3);});});
 const parseHex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
 document.querySelectorAll('[data-palette]').forEach(el=>el.addEventListener('input',()=>setRgb(parseHex(el.value))));
 const presets=['#000000','#FFFFFF','#FF0000','#00FF00','#0000FF','#00FFFF','#FF00FF','#FFFF00','#808080','#4967EB'];
 document.querySelectorAll('[data-swatches]').forEach(box=>presets.forEach(h=>{let b=document.createElement('button');b.className='swatch';b.style.background=h;b.title=h;b.setAttribute('aria-label','Выбрать '+h+' в '+box.dataset.swatches);b.onclick=()=>setRgb(parseHex(h));box.appendChild(b);}));
 document.getElementById('hex-form').onsubmit=e=>{e.preventDefault();let v=document.getElementById('hex').value.trim();if(!v.startsWith('#'))v='#'+v;if(!/^#[0-9a-f]{6}$/i.test(v)){notice('HEX должен содержать 6 шестнадцатеричных цифр, например #4967EB.');return;}setRgb(parseHex(v));};
 document.getElementById('method').onchange=e=>{method=e.target.value;refresh();notice('Цвет сохранён; цветоделение CMYK пересчитано по '+method+'.');};
 document.getElementById('strength').oninput=e=>{strength=+e.target.value/100;document.getElementById('strength-value').textContent=e.target.value+'%';refresh();notice();};
 document.getElementById('white').onchange=e=>{white=e.target.value;refresh();notice('Освещение '+white+': матрица и координаты XYZ/LAB пересчитаны; экранный цвет сохранён.');};
 document.getElementById('strategy').onchange=e=>{strategy=e.target.value;setRgb(rawRgb||rgb,'Выбрано: '+(strategy==='clipping'?'обрезание':'масштабирование')+'.');};
 let paletteHue=170, drawnHue=null;
 const canvas=document.getElementById('color-plane'),ctx=canvas.getContext('2d');
 function renderPalette(){let hls=M.rgbToHls(rgb);if(hls[2]>1e-7)paletteHue=hls[0];document.getElementById('palette-hue').value=paletteHue;
 if(drawnHue!==paletteHue){let im=ctx.createImageData(canvas.width,canvas.height);for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){let v=M.hlsToRgb([paletteHue,100*(1-y/(canvas.height-1)),100*x/(canvas.width-1)]),i=(y*canvas.width+x)*4;im.data[i]=v[0];im.data[i+1]=v[1];im.data[i+2]=v[2];im.data[i+3]=255;}ctx.putImageData(im,0,0);drawnHue=paletteHue;}
 let marker=document.getElementById('palette-marker');marker.style.left=hls[2]+'%';marker.style.top=(100-hls[1])+'%';canvas.setAttribute('aria-label',`Палитра: насыщенность ${hls[2].toFixed(0)}%, светлота ${hls[1].toFixed(0)}%. Стрелки меняют цвет.`);
 }
 function planeInput(e){let r=canvas.getBoundingClientRect(),s=M.clamp((e.clientX-r.left)/r.width)*100,l=(1-M.clamp((e.clientY-r.top)/r.height))*100;setRgb(M.hlsToRgb([paletteHue,l,s]));}
 canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);planeInput(e);};
 canvas.onpointermove=e=>{if(canvas.hasPointerCapture(e.pointerId))planeInput(e);};
 canvas.onpointerup=e=>{if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);};
 canvas.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();let hls=M.rgbToHls(rgb),d=e.shiftKey?10:1;hls[0]=paletteHue;if(e.key==='ArrowLeft')hls[2]-=d;if(e.key==='ArrowRight')hls[2]+=d;if(e.key==='ArrowUp')hls[1]+=d;if(e.key==='ArrowDown')hls[1]-=d;hls[1]=M.clamp(hls[1],0,100);hls[2]=M.clamp(hls[2],0,100);setRgb(M.hlsToRgb(hls));};
 document.getElementById('palette-hue').oninput=e=>{paletteHue=+e.target.value;let hls=M.rgbToHls(rgb);setRgb(M.hlsToRgb([paletteHue,hls[1],hls[2]]));};
 refresh();notice();return{setRgb,getColorimetry:()=>({white,matrix:colorimetry.matrix.map(r=>r.slice()),xyz:colorimetry.xyz.slice(),lab:colorimetry.lab.slice()})};
})();
