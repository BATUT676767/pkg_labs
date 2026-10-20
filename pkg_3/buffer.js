function installPixelBuffer() {
  class PixelBuffer {
    constructor(width,height,data) {
      if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||!data||data.length!==width*height*4)throw new Error('Некорректный пиксельный буфер');
      this.width=width;this.height=height;this.data=data;
    }
    static edge(index,length,mode='reflect') {
      if(length===1)return 0;
      if(mode==='clamp')return Math.min(length-1,Math.max(0,index));
      if(mode!=='reflect')throw new Error('Неизвестный режим границы');
      const period=2*length;
      index=((index%period)+period)%period;
      return index<length?index:period-index-1;
    }
    offset(x,y,mode){return (PixelBuffer.edge(y,this.height,mode)*this.width+PixelBuffer.edge(x,this.width,mode))*4;}
    crop(start,rows){return new PixelBuffer(this.width,rows,this.data.slice(start*this.width*4,(start+rows)*this.width*4));}
  }
  globalThis.PixelBuffer=PixelBuffer;
}
installPixelBuffer();
if(typeof module!=='undefined')module.exports={PixelBuffer,installPixelBuffer};
