// M7B3: deterministic procedural *draft* terrain, not surveyed geography.
export const MAP_W = 1152;
export const MAP_H = 576;
export const PLANET_RADIUS_KM = 8500;
const TWO_PI = Math.PI * 2;
const continents = [
  { id: 'C1', lon: -118, lat: 34, rx: 43, ry: 38, size: 1.00 },
  { id: 'C2', lon: 70, lat: 8, rx: 51, ry: 35, size: 0.92 },
  { id: 'C3', lon: -112, lat: -38, rx: 39, ry: 37, size: 0.90 },
  { id: 'C4', lon: 20, lat: 73, rx: 63, ry: 23, size: 1.02 },
  { id: 'C5', lon: 136, lat: -39, rx: 35, ry: 29, size: 0.82 },
];
export const regions = continents.map(({id,lon,lat})=>({id,lon,lat}));
const fract=x=>x-Math.floor(x);
const hash=(x,y)=>fract(Math.sin(x*127.1+y*311.7+43.2)*43758.5453);
function noise(x,y){
  const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
  const u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
  const a=hash(ix,iy)*(1-u)+hash(ix+1,iy)*u;
  const b=hash(ix,iy+1)*(1-u)+hash(ix+1,iy+1)*u;
  return a*(1-v)+b*v;
}
function fbm(x,y){
  let v=0,amp=.5,freq=1;
  for(let i=0;i<5;i++){v+=noise(x*freq,y*freq)*amp;freq*=2.07;amp*=.49}
  return v;
}
const wrap=(lon,center)=>((lon-center+540)%360)-180;
function heightRaw(lon,lat){
  const distortX=(fbm(lon*.065+13,lat*.065+31)-.49)*16;
  const distortY=(fbm(lon*.075+61,lat*.075+17)-.49)*15;
  let land=-.36;
  for(const c of continents){
    const x=wrap(lon+distortX,c.lon)/c.rx;
    const y=(lat+distortY-c.lat)/c.ry;
    const v=Math.exp(-2.0*(x*x+y*y))*c.size;
    land=Math.max(land,v-.39);
  }
  // Polar north continental territory; polar south is a sea.
  if(lat>67) land=Math.max(land, .32*Math.exp(-Math.pow((lat-81)/17,2)) - .18);
  if(lat< -77) land-=.7;
  const arch=fbm(lon*.27+188,lat*.27+51);
  const detail=fbm(lon*.13+50,lat*.13+70);
  return land + (detail-.49)*.28 + (arch-.49)*.10;
}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const mix=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
function colorFor(h,lat,detail,mode){
  const polar=Math.abs(lat);
  const r=detail;
  if(h<=0){
    const deep=clamp(-h*3,0,1);
    let col=mix([32,119,153],[9,45,82],deep);
    const shelf=clamp((h+.085)*10,0,1);
    col=mix(col,[39,140,164],shelf*.62);
    if(polar>78) col=mix(col,[203,222,224],clamp((polar-78)/10,0,.93));
    return col;
  }
  const elevation=clamp((h-.02)*1.9 + (r-.49)*.24,0,1);
  const temp=31 - Math.abs(lat)*.67 - elevation*22;
  const dryness=fbm(lat*.105+46,h*10+77);
  let col;
  if(temp< -7 || (polar>72 && elevation>.18)) col=[229,233,224];
  else if(elevation>.72) col=[162,155,137];
  else if(elevation>.49) col=mix([91,110,80],[171,157,130],(elevation-.49)/.23);
  else if(dryness>.56 && temp>9) col=mix([153,150,91],[207,177,121],clamp((dryness-.56)*3,0,1));
  else if(temp>22) col=[49,103,66];
  else if(temp>8) col=[80,126,77];
  else col=[96,118,92];
  const light=clamp(0.84+(r-.45)*.48, .65,1.2);
  return col.map(c=>Math.round(clamp(c*light,0,255)));
}
export function createWorldCanvas({graticule=false, labels=false}={}){
  const cvs=document.createElement('canvas');cvs.width=MAP_W;cvs.height=MAP_H;
  const ctx=cvs.getContext('2d',{willReadFrequently:true});
  const values=new Float32Array(MAP_W*MAP_H);
  const histogram=new Uint32Array(600);
  for(let y=0;y<MAP_H;y++){
    const lat=90-180*(y+.5)/MAP_H;
    for(let x=0;x<MAP_W;x++){
      const lon=360*(x+.5)/MAP_W-180;
      const h=heightRaw(lon,lat);
      const i=y*MAP_W+x; values[i]=h;
      histogram[clamp(Math.floor((h+1)*300),0,599)]++;
    }
  }
  // Uniform-pixel approximation. Land fraction measured on sphere will differ;
  // numerical surface calibration is a later milestone.
  const target=MAP_W*MAP_H*.70;
  let acc=0,index=0;
  for(;index<600;index++){acc+=histogram[index];if(acc>=target)break}
  const seaLevel=index/300-1;
  const image=ctx.createImageData(MAP_W,MAP_H);
  for(let y=0;y<MAP_H;y++){
    const lat=90-180*(y+.5)/MAP_H;
    for(let x=0;x<MAP_W;x++){
      const i=y*MAP_W+x;
      const lon=360*(x+.5)/MAP_W-180;
      const h=values[i]-seaLevel;
      const dt=fbm(lon*.18+82,lat*.18+12);
      const col=colorFor(h,lat,dt);
      const j=i*4;
      image.data[j]=col[0];image.data[j+1]=col[1];image.data[j+2]=col[2];image.data[j+3]=255;
    }
  }
  ctx.putImageData(image,0,0);
  if(graticule){
    ctx.strokeStyle='rgba(255,255,255,.29)';ctx.lineWidth=1;
    for(let lon=-150;lon<180;lon+=30){const x=(lon+180)/360*MAP_W;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,MAP_H);ctx.stroke()}
    for(let lat=-60;lat<90;lat+=30){const y=(90-lat)/180*MAP_H;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(MAP_W,y);ctx.stroke()}
  }
  if(labels){
    ctx.font='600 15px system-ui';ctx.textAlign='center';
    for(const c of continents){
      const x=(c.lon+180)/360*MAP_W,y=(90-c.lat)/180*MAP_H;
      ctx.lineWidth=3;ctx.strokeStyle='rgba(0,0,0,.7)';ctx.fillStyle='white';
      ctx.strokeText(c.id,x,y);ctx.fillText(c.id,x,y);
    }
  }
  return cvs;
}
export function pointToCoords(x,y,w,h,view){
  const scale=view.zoom;const offsetX=view.x*w,offsetY=view.y*h;
  const worldX=(x-offsetX)/(w*scale),worldY=(y-offsetY)/(h*scale);
  return {lon:((worldX*360+180)%360+360)%360-180,lat:clamp(90-worldY*180,-90,90)};
}
