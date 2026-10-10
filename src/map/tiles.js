import {heightRaw,colorFor,PLANET_RADIUS_KM} from './terrain.js';
export const TILE_SIZE=256;
export const MAX_ZOOM=19;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let sea;
export function calibratedSeaLevel(){
 if(sea!==undefined)return sea;
 const h=[],weights=[];
 for(let y=0;y<90;y++){const lat=89-(y*2);const weight=Math.cos(lat*Math.PI/180);
 for(let x=0;x<180;x++){h.push([heightRaw(-179+x*2,lat),weight]);}}
 h.sort((a,b)=>a[0]-b[0]);const total=h.reduce((s,a)=>s+a[1],0);let sum=0;sea=h[0][0];
 for(const [value,w] of h){sum+=w;if(sum/total>=.7){sea=value;break}}
 return sea;
}
function detailNoise(lon,lat,z){
 // Deterministic additional fine detail; it does NOT create surveyed features.
 if(z<5)return 0;
 const scale=Math.pow(2,Math.min(15,z-4));
 const a=Math.sin((lon*scale*1.79+lat*scale*.31)*12.9898)*43758.5453;
 const b=Math.sin((lon*scale*.37-lat*scale*1.27)*27.188)*98765.4321;
 return ((a-Math.floor(a))+(b-Math.floor(b))-1)*Math.min(.018,.002*z);
}
export function tileImage(z,tx,ty,{graticule=false}={}){
 const width=2**(z+1),height=2**z;
 if(ty<0||ty>=height)return null;
 const wrapped=((tx%width)+width)%width;
 const canvas=document.createElement('canvas');canvas.width=TILE_SIZE;canvas.height=TILE_SIZE;
 const ctx=canvas.getContext('2d');const im=ctx.createImageData(TILE_SIZE,TILE_SIZE);
 const level=calibratedSeaLevel();
 for(let py=0;py<TILE_SIZE;py++){
  const v=(ty+(py+.5)/TILE_SIZE)/height;
  const lat=90-v*180;
  for(let px=0;px<TILE_SIZE;px++){
   const lon=-180+((wrapped+(px+.5)/TILE_SIZE)/width)*360;
   const elev=heightRaw(lon,lat)-level;
   const baseDetail=(Math.sin(lon*.46+lat*.2)*Math.cos(lat*.39-lon*.18)+1)*.25;
   const detail=clamp(.34+baseDetail+detailNoise(lon,lat,z),0,1);
   const rgb=colorFor(elev,lat,detail);
   const idx=(py*TILE_SIZE+px)*4;
   im.data[idx]=rgb[0];im.data[idx+1]=rgb[1];im.data[idx+2]=rgb[2];im.data[idx+3]=255;
  }
 }
 ctx.putImageData(im,0,0);
 if(graticule){
  ctx.strokeStyle='rgba(255,255,255,.28)';ctx.lineWidth=.8;
  const x0=wrapped/width*360-180,y0=90-ty/height*180;
  const degWidth=360/width,degHeight=180/height;
  const step=z>=6?1:z>=3?10:30;
  for(let lon=Math.ceil(x0/step)*step;lon<x0+degWidth;lon+=step){let x=(lon-x0)/degWidth*TILE_SIZE;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,TILE_SIZE);ctx.stroke()}
  for(let lat=Math.floor(y0/step)*step;lat>y0-degHeight;lat-=step){let y=(y0-lat)/degHeight*TILE_SIZE;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(TILE_SIZE,y);ctx.stroke()}
 }
 return canvas;
}
export class TileCache{
 constructor(limit=100){this.limit=limit;this.items=new Map()}
 get(k){const value=this.items.get(k);if(value){this.items.delete(k);this.items.set(k,value)}return value}
 put(k,v){if(this.items.has(k))this.items.delete(k);this.items.set(k,v);while(this.items.size>this.limit)this.items.delete(this.items.keys().next().value)}
 clear(){this.items.clear()}
}
export function metersPerPixel(lat,zoom){
 return (2*Math.PI*PLANET_RADIUS_KM*1000*Math.cos(lat*Math.PI/180))/(512*(2**zoom));
}
export function visibleTiles(w,h,camera){
 const z=clamp(Math.floor(camera.zoom),0,MAX_ZOOM);
 const scale=2**(camera.zoom-z);const side=TILE_SIZE*scale;
 const worldWidth=(2**(z+1))*side,worldHeight=(2**z)*side;
 const startX=(w-worldWidth)/2+camera.panX;
 const startY=(h-worldHeight)/2+camera.panY;
 const minX=Math.floor(-startX/side),maxX=Math.floor((w-startX)/side);
 const minY=Math.max(0,Math.floor(-startY/side)),maxY=Math.min(2**z-1,Math.floor((h-startY)/side));
 const tiles=[];
 for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++)tiles.push({z,x,y,sx:startX+x*side,sy:startY+y*side,side});
 return tiles;
}
export function coordinateAt(px,py,w,h,camera){
 const worldW=512*(2**camera.zoom),worldH=worldW/2;
 const x=(px-(w-worldW)/2-camera.panX)/worldW;
 const y=(py-(h-worldH)/2-camera.panY)/worldH;
 return {lon:((x*360%360)+540)%360-180,lat:clamp(90-y*180,-90,90)};
}
