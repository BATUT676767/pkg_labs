const fs=require('node:fs'),path=require('node:path');
let html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
html=html.replace('<link rel="stylesheet" href="styles.css">',()=>`<style>${fs.readFileSync(path.join(__dirname,'styles.css'),'utf8')}</style>`);
for(const name of ['buffer.js','model.js','samples.js','worker.js','engine.js','view.js','controller.js'])html=html.replace(`<script src="${name}"></script>`,()=>`<script>${fs.readFileSync(path.join(__dirname,name),'utf8').replaceAll('</script','<\\/script')}</script>`);
fs.writeFileSync(path.join(__dirname,'Обработка_изображений_вариант_2.html'),html);
console.log('Автономная версия создана');
