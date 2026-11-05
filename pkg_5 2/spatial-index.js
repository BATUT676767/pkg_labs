class Quadtree {
  constructor(data,depth=8,capacity=48,bounds=[-11000,-11000,11000,11000]){this.data=data;this.depth=depth;this.capacity=capacity;this.owner=new Array(data.length/4);this.slots=new Int32Array(data.length/4);this.root=this.node(bounds,0);for(let id=0;id<data.length/4;id++)this.insert(id);}
  node(box,level){return {box,level,ids:[],children:null};}
  box(id){const i=id*4,d=this.data;return [Math.min(d[i],d[i+2]),Math.min(d[i+1],d[i+3]),Math.max(d[i],d[i+2]),Math.max(d[i+1],d[i+3])];}
  child(n,b){const mx=(n.box[0]+n.box[2])/2,my=(n.box[1]+n.box[3])/2,x=b[2]<mx-Geometry.EPS?0:b[0]>mx+Geometry.EPS?1:-1,y=b[3]<my-Geometry.EPS?0:b[1]>my+Geometry.EPS?1:-1;return x<0||y<0?-1:y*2+x;}
  split(n){const [x0,y0,x1,y1]=n.box,mx=(x0+x1)/2,my=(y0+y1)/2;n.children=[[x0,y0,mx,my],[mx,y0,x1,my],[x0,my,mx,y1],[mx,my,x1,y1]].map(b=>this.node(b,n.level+1));const ids=n.ids;n.ids=[];for(const id of ids)this.insert(id,n);}
  insert(id,node=this.root){const b=this.box(id);let n=node;while(n.children){const c=this.child(n,b);if(c<0)break;n=n.children[c];}this.owner[id]=n;this.slots[id]=n.ids.length;n.ids.push(id);if(!n.children&&n.ids.length>this.capacity&&n.level<this.depth)this.split(n);}
  remove(id){const n=this.owner[id],slot=this.slots[id],last=n.ids.pop();if(slot<n.ids.length){n.ids[slot]=last;this.slots[last]=slot;}this.owner[id]=null;}
  update(id,s){this.remove(id);this.data.set(s,id*4);this.insert(id);}
  query(r,stats={nodes:0,candidates:0}){const result=[],d=this.data,eps=Geometry.EPS;
    const visit=n=>{stats.nodes++;const b=n.box;if(b[2]<r[0]-eps||b[0]>r[2]+eps||b[3]<r[1]-eps||b[1]>r[3]+eps)return;for(const id of n.ids){stats.candidates++;const i=id*4;const mask=(Math.max(d[i],d[i+2])<r[0]-eps?1:0)|(Math.min(d[i],d[i+2])>r[2]+eps?2:0)|(Math.max(d[i+1],d[i+3])<r[1]-eps?4:0)|(Math.min(d[i+1],d[i+3])>r[3]+eps?8:0);if(mask)continue;result.push(id);}if(n.children)for(const child of n.children)visit(child);};visit(this.root);return result;
  }
}
if(typeof module!=='undefined')module.exports=Quadtree;
