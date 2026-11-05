const Data={
  random(seed=5){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};},
  generate(n=500000,density=1,seed=20261105){const rand=this.random(seed),d=new Float64Array(n*4),span=10000/Math.sqrt(density);for(let i=0;i<n;i++){const x=(rand()*2-1)*span,y=(rand()*2-1)*span,angle=rand()*Math.PI*2,length=2+rand()*30;d.set([x,y,x+Math.cos(angle)*length,y+Math.sin(angle)*length],i*4);}return d;},
  parse(text){const rows=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/).filter(s=>s.trim()).map(s=>s.trim().split(/\s+/).map(Number)),n=rows[0]?.[0];if(rows[0]?.length!==1||!Number.isInteger(n)||n<0||n>1000000||rows.length!==n+2)throw Error('TXT: первая строка — число отрезков, затем n строк по 4 координаты и строка окна.');for(const r of rows.slice(1))if(r.length!==4||!r.every(v=>Number.isFinite(v)&&Math.abs(v)<=1e6))throw Error('Ожидаются четыре конечные координаты в пределах ±1 000 000.');const rect=rows.at(-1);if(rect[2]-rect[0]<=Geometry.EPS||rect[3]-rect[1]<=Geometry.EPS)throw Error('Окно должно иметь положительную ширину и высоту.');return {segments:rows.slice(1,-1),rect};},
  examples:{
    lines:{rect:[-5,-4,5,4],segments:[[-9,-6,9,6],[-8,2,8,2],[0,-8,0,8],[-5,-4,5,-4],[5,4,5,4],[-8,7,8,7],[-9,0,0,9],[0,0,0,0]]},
    split:{subject:[[[-8,-6],[-3,-6],[-3,3],[3,3],[3,-6],[8,-6],[8,7],[-8,7]]],clip:[[[-10,-5],[10,-5],[10,1],[-10,1]]]},
    hole:{subject:[[[-8,-7],[8,-7],[8,7],[-8,7]],[[-3,-2],[-3,2],[3,2],[3,-2]]],clip:[[[-6,-5],[6,-5],[6,5],[-6,5]]]},
    cross:{subject:[[[-8,-6],[8,6],[-8,6],[8,-6]]],clip:[[[-6,-5],[6,-5],[6,5],[-6,5]]]},
    touch:{subject:[[[-8,0],[0,-8],[8,0],[0,8]]],clip:[[[-4,-4],[4,-4],[4,4],[-4,4]]]},
    concave:{subject:[[[-8,-6],[8,-6],[8,6],[2,6],[2,0],[-2,0],[-2,6],[-8,6]]],clip:[[[-6,-4],[6,-4],[6,4],[0,2],[-6,4]]]}
  }
};
if(typeof module!=='undefined')module.exports=Data;
