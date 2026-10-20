class GridPainter {
  constructor(canvas,labels){this.canvas=canvas;this.labels=labels;this.zoom=16;this.panX=0;this.panY=0;}
  render(grid){
    const c=this.canvas,w=c.clientWidth,h=c.clientHeight;if(w<1||h<1)return;c.width=Math.round(w);c.height=Math.round(h);const image=new ImageData(c.width,c.height),z=this.zoom,ox=w/2+this.panX,oy=h/2+this.panY;
    for(let py=0;py<c.height;py++)for(let px=0;px<c.width;px++){
      const x=Math.floor((px-ox)/z+.5),y=Math.floor((oy-py)/z+.5),a=grid.get(x,y),i=(py*c.width+px)*4;
      let color=[248,252,249];if(a>0)color=color.map((v,k)=>Math.round(v*(1-a)+[26,119,99][k]*a));
      const vx=((px-ox+z/2)%z+z)%z,vy=((py-oy+z/2)%z+z)%z;
      if(z>=5&&(vx<1||vy<1))color=[206,224,215];if(Math.abs(px-ox)<.65||Math.abs(py-oy)<.65)color=[107,149,133];
      image.data[i]=color[0];image.data[i+1]=color[1];image.data[i+2]=color[2];image.data[i+3]=255;
    }
    c.getContext('2d').putImageData(image,0,0);this.labels.replaceChildren();const every=Math.max(1,Math.ceil(45/z));
    const label=(text,x,y)=>{const s=document.createElement('span');s.textContent=text;s.style.left=x+'px';s.style.top=y+'px';this.labels.append(s);};
    for(let x=Math.ceil(-ox/z/every)*every;x<(w-ox)/z;x+=every)label(x,ox+x*z+2,Math.max(0,Math.min(h-18,oy+4)));
    for(let y=Math.ceil((oy-h)/z/every)*every;y<oy/z;y+=every)if(y)label(y,Math.max(0,Math.min(w-35,ox+5)),oy-y*z-8);
    label('X →',w-35,Math.max(0,Math.min(h-18,oy+22)));label('Y ↑',Math.max(0,Math.min(w-35,ox+5)),3);
  }
  coordinate(event){const rect=this.canvas.getBoundingClientRect();return [Math.round((event.clientX-rect.left-this.canvas.clientWidth/2-this.panX)/this.zoom),Math.round((this.canvas.clientHeight/2+this.panY-event.clientY+rect.top)/this.zoom)];}
}
