class VirtualGrid {
  constructor(width=257,height=257) { this.width=width; this.height=height; this.cx=Math.floor(width/2); this.cy=Math.floor(height/2); this.rows=Array.from({length:height},()=>new Float64Array(width)); }
  setPixel(x,y,intensity=1) { const col=x+this.cx,row=this.cy-y; if(col>=0&&col<this.width&&row>=0&&row<this.height) this.rows[row][col]=Math.max(this.rows[row][col],Math.min(1,Math.max(0,intensity))); }
  clear() { for(const row of this.rows) row.fill(0); }
  get(x,y) { return this.rows[this.cy-y]?.[x+this.cx]??0; }
  count() { let n=0; for(const row of this.rows) for(const v of row) if(v>0)n++; return n; }
}
if(typeof module!=='undefined')module.exports=VirtualGrid;
