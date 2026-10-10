import React,{useEffect,useRef,useState,useCallback} from 'react';
import { Search, Layers3, Plus, Minus, Crosshair, Globe2, Map, Info, X, PanelLeftClose, PanelLeftOpen, Check } from 'lucide-react';
import {regions,PLANET_RADIUS_KM} from './map/terrain.js';
import {TileCache,tileImage,visibleTiles,coordinateAt,metersPerPixel,MAX_ZOOM} from './map/tiles.js';
const LAYERS={graticule:false,labels:true};
const fmt=(v,positive,negative)=>Math.abs(v).toFixed(2)+'° '+(v>=0?positive:negative);
export default function App(){
 const stage=useRef(null),canvas=useRef(null),cache=useRef(new TileCache(110)),pending=useRef(new Set()),drag=useRef(null),drawRef=useRef(null),worker=useRef(null),queue=useRef([]),busy=useRef(false);
 const [camera,setCamera]=useState({zoom:1,panX:0,panY:0});
 const [size,setSize]=useState({w:1024,h:600});
 const [layers,setLayers]=useState(LAYERS);
 const [sidebar,setSidebar]=useState(true),[panel,setPanel]=useState(false),[mode,setMode]=useState('satellite'),[search,setSearch]=useState('');
 const [cursor,setCursor]=useState({lat:0,lon:0}),[selected,setSelected]=useState(null),[tileCount,setTileCount]=useState(0);
 const requestDraw=()=>{if(drawRef.current)cancelAnimationFrame(drawRef.current);drawRef.current=requestAnimationFrame(()=>setTileCount(n=>n+1))};
 useEffect(()=>{if(!stage.current)return;const ob=new ResizeObserver(()=>setSize({w:stage.current.clientWidth,h:stage.current.clientHeight}));ob.observe(stage.current);return()=>ob.disconnect()},[]);
 useEffect(()=>{
  let w;
  const handleTile=data=>{
    busy.current=false;
    pending.current.delete(data.key);
    if(data.bitmap){cache.current.put(data.key,data.bitmap);requestDraw()}
    else if(data.error)console.error('M7B3 tile:',data.error);
    processQueue.current();
  };
  try{
    w=new Worker(new URL('./map/tile-worker.js',import.meta.url),{type:'module'});
    worker.current=w;
    w.onmessage=({data})=>handleTile(data);
    w.onerror=e=>{
      console.error('M7B3 Worker failed, using fallback:',e);
      w.terminate();worker.current=null;busy.current=false;pending.current.clear();queue.current=[];
      requestDraw();
    };
  }catch(error){console.warn('M7B3 Worker unavailable:',error);worker.current=null}
  return()=>{w?.terminate();worker.current=null;queue.current=[];busy.current=false};
 },[]);
 const processQueue=useRef(()=>{});
 processQueue.current=()=>{
  if(busy.current)return;
  const item=queue.current.shift();
  if(!item)return;
  busy.current=true;
  if(worker.current){worker.current.postMessage(item);return}
  setTimeout(()=>{
    try{const canvas=tileImage(item.z,item.x,item.y,{graticule:item.graticule});if(canvas)cache.current.put(item.key,canvas)}
    catch(e){console.error('M7B3 fallback tile:',e)}
    busy.current=false;pending.current.delete(item.key);requestDraw();processQueue.current();
  },0);
 };
 useEffect(()=>{
  const c=canvas.current;if(!c)return;
  const ratio=Math.min(devicePixelRatio||1,2),{w,h}=size;
  if(c.width!==Math.floor(w*ratio)||c.height!==Math.floor(h*ratio)){
   c.width=Math.max(1,Math.floor(w*ratio));c.height=Math.max(1,Math.floor(h*ratio));
   c.style.width=w+'px';c.style.height=h+'px';
  }
  const ctx=c.getContext('2d');ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.fillStyle='#0b324c';ctx.fillRect(0,0,w,h);
  const visible=visibleTiles(w,h,camera);
  // Discard no-longer-visible queued requests; completed requests stay cached.
  const keys=new Set(visible.map(t=>t.z+'/'+t.x+'/'+t.y+'/'+Number(layers.graticule)));
  queue.current=queue.current.filter(t=>{if(keys.has(t.key))return true;pending.current.delete(t.key);return false});
  for(const t of visible){
   const key=t.z+'/'+t.x+'/'+t.y+'/'+Number(layers.graticule);
   const tile=cache.current.get(key);
   if(tile){ctx.drawImage(tile,t.sx,t.sy,t.side+.5,t.side+.5)}
   else if(!pending.current.has(key)){
    pending.current.add(key);
    queue.current.push({key,z:t.z,x:t.x,y:t.y,graticule:layers.graticule});
   }
  }
  if(layers.labels){
   ctx.textAlign='center';ctx.font='700 15px system-ui';ctx.lineWidth=3;ctx.strokeStyle='#10231dbb';ctx.fillStyle='white';
   const worldW=512*2**camera.zoom,worldH=worldW/2,left=(w-worldW)/2+camera.panX,top=(h-worldH)/2+camera.panY;
   for(const r of regions){
    const x=left+(r.lon+180)/360*worldW,y=top+(90-r.lat)/180*worldH;
    if(x>=0&&x<w&&y>=0&&y<h){ctx.strokeText(r.id,x,y);ctx.fillText(r.id,x,y)}
   }
  }
  processQueue.current();
 },[camera,size,layers,tileCount]);
 useEffect(()=>()=>{if(drawRef.current)cancelAnimationFrame(drawRef.current)},[]);
 const zoom=(factor)=>setCamera(v=>({...v,zoom:Math.max(0,Math.min(MAX_ZOOM,v.zoom+factor))}));
 const navigate=r=>{const z=3,worldW=512*2**z;setCamera({zoom:z,panX:-(r.lon/360)*worldW,panY:(r.lat/180)*worldW/2});setSelected(r.id);setSearch(r.id)};
 const reset=()=>{setCamera({zoom:1,panX:0,panY:0});setSelected(null)};
 const handleSearch=e=>{e.preventDefault();const r=regions.find(r=>r.id.toLowerCase()===search.trim().toLowerCase());if(r)navigate(r)};
 const coords=e=>{const box=stage.current.getBoundingClientRect();return coordinateAt(e.clientX-box.left,e.clientY-box.top,size.w,size.h,camera)};
 const move=e=>{if(drag.current){const dx=e.clientX-drag.current.x,dy=e.clientY-drag.current.y;drag.current={x:e.clientX,y:e.clientY};setCamera(v=>({...v,panX:v.panX+dx,panY:v.panY+dy}))}setCursor(coords(e))};
 return <div className="shell">
  {sidebar&&<aside className="sidebar"><div className="brand"><div className="logo"><Globe2 size={23}/></div><div><strong>M7B3 <span>Maps</span></strong><small>ATLAS PLANÉTAIRE</small></div><button className="icon-btn close-sidebar" onClick={()=>setSidebar(false)} aria-label="Fermer le menu"><PanelLeftClose size={19}/></button></div>
  <form className="search" onSubmit={handleSearch}><Search size={18}/><input aria-label="Chercher un continent" placeholder="Rechercher C1, C2…" value={search} onChange={e=>setSearch(e.target.value)}/><kbd>↵</kbd></form>
  <div className="section-title">EXPLORATION</div>
  <button className="nav-item active" onClick={()=>setMode('satellite')}><Globe2 size={18}/> Carte satellite <span className="tag">ACTIF</span></button>
  <button className="nav-item" onClick={()=>setMode('plan')}><Map size={18}/> Carte en plan <span className="tag muted">À VENIR</span></button>
  <button className="nav-item" onClick={()=>setPanel(true)}><Layers3 size={18}/> Calques cartographiques</button>
  <div className="section-title">GÉOGRAPHIE</div><div className="region-list">{regions.map(r=><button className={'region '+(selected===r.id?'chosen':'')} key={r.id} onClick={()=>navigate(r)}><span className="dot"/> Continent {r.id}<span className="chev">›</span></button>)}</div>
  <div className="sidebar-bottom"><Info size={17}/><span>Atlas satellite à tuiles<br/><b>Version 0.2 expérimentale</b></span></div></aside>}
  <main className="main"><header className="topbar">{!sidebar&&<button className="icon-btn" onClick={()=>setSidebar(true)} aria-label="Ouvrir le menu"><PanelLeftOpen size={20}/></button>}<div className="crumb"><span>M7B3</span><span className="slash">/</span><b>Satellite multirésolution</b></div><div className="top-actions"><span className="live-dot"/><span className="status">Terrain procédural</span><button className="top-button" onClick={()=>setPanel(true)}><Layers3 size={16}/> Calques</button></div></header>
  <div className="map-stage" ref={stage} onPointerDown={e=>{if(e.button!==0)return;drag.current={x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={move} onPointerUp={()=>drag.current=null} onPointerCancel={()=>drag.current=null} onWheel={e=>{e.preventDefault();zoom(e.deltaY<0?.4:-.4)}}>
  <canvas className="map-canvas" ref={canvas}/>
  <div className="map-top-left"><span className="pill dark"><span className="live-dot"/> M7B3 · SATELLITE</span></div>
  <div className="right-controls"><div className="control-box"><button title="Zoom avant" onClick={()=>zoom(1)}><Plus size={20}/></button><button title="Zoom arrière" onClick={()=>zoom(-1)}><Minus size={20}/></button></div><div className="control-box"><button title="Recentrer" onClick={reset}><Crosshair size={20}/></button><button title="Calques" onClick={()=>setPanel(true)}><Layers3 size={20}/></button></div></div>
  <div className="map-watermark"><Globe2 size={15}/> M7B3 <span>·</span> Rendu procédural, non photographique</div>
  <div className="bottom-map"><div className="coordinates"><Crosshair size={14}/>{fmt(cursor.lat,'N','S')} &nbsp; {fmt(cursor.lon,'E','O')}</div><div className="zoom-chip">Z {camera.zoom.toFixed(1)} · {Math.round(metersPerPixel(cursor.lat,camera.zoom)).toLocaleString('fr-FR')} m/px</div></div>
  {mode==='plan'&&<div className="notice"><Map size={18}/><div><b>Mode Plan à venir</b><span>Les routes, pays et bâtiments seront ajoutés après les données géographiques.</span></div><button onClick={()=>setMode('satellite')}><X size={16}/></button></div>}
  </div><footer className="footer"><div><span className="foot-mark">M7B3</span> <span className="divider">/</span> Rayon : {PLANET_RADIUS_KM.toLocaleString('fr-FR')} km</div><div>Carte satellite expérimentale <span className="sep">·</span> 256 px / tuile</div></footer></main>
  {panel&&<><div className="scrim" onClick={()=>setPanel(false)}/><section className="layer-panel"><div className="panel-head"><div><small>PERSONNALISATION</small><h2>Calques</h2></div><button className="icon-btn" onClick={()=>setPanel(false)}><X size={21}/></button></div><div className="panel-body"><div className="panel-subtitle">CALQUES DISPONIBLES</div>{[['graticule','Grille géographique'],['labels','Codes des continents']].map(([key,label])=><label className="layer-row" key={key}><span>{label}</span><input type="checkbox" checked={layers[key]} onChange={()=>setLayers(x=>({...x,[key]:!x[key]}))}/><span className={'switch '+(layers[key]?'on':'')}>{layers[key]&&<Check size={12}/>}</span></label>)}<div className="panel-note"><Info size={18}/><span>La carte charge uniquement les tuiles visibles et les garde en cache. Hydrographie, relief métrique, routes et bâtiments nécessitent des données distinctes : le zoom ne crée pas ces objets automatiquement.</span></div></div><button className="panel-done" onClick={()=>setPanel(false)}>Terminé</button></section></>}
 </div>;
}
