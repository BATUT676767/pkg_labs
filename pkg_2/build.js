const fs=require('node:fs');
const path=require('node:path');
const root=__dirname;
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
html=html.replace('<link rel="stylesheet" href="styles.css">',()=>`<style>${fs.readFileSync(path.join(root,'styles.css'),'utf8')}</style>`);
for(const name of ['model.js','worker.js','engine.js','view.js','controller.js'])html=html.replace(`<script src="${name}"></script>`,()=>`<script>${fs.readFileSync(path.join(root,name),'utf8').replaceAll('</script','<\\/script')}</script>`);
fs.writeFileSync(path.join(root,'Графические_файлы_лабораторная_2.html'),html);
console.log('Автономная версия создана');
