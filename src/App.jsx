import React,{useEffect,useRef,useState,useCallback} from 'react';
import { Search, Layers3, Plus, Minus, Crosshair, Globe2, Map, Info, X, PanelLeftClose, PanelLeftOpen, Check } from 'lucide-react';
import {regions,PLANET_RADIUS_KM} from './map/terrain.js';
import {TileCache,tileImage,visibleTiles,coordinateAt,metersPerPixel,MAX_ZOOM} from './map/tiles.js';
const LAYERS={graticule:false,labels:true};
const fmt=(v,positive,negative)=>Math.abs(v).toFixed(2)+'° '+(v>=0?positive:negative);
export default function App(){
 const stage=useRef(null),canvas=useRef(null),cache=useRef(new TileCache(110)),pending=useRef(new Set()),drag=useRef(null),drawRef=useRef(null);
 const [camera,setCamera]=useState({zoom:1,panX:0,panY:0});
 const [size,setSize]=useState({w:1024,h:600});
 const [layers,setLayers]=useState(LAYERS);
 const [sidebar,setSidebar]=useState(true),[panel,setPanel]=useState(false),[mode,setMode]=useState('satellite'),[search,setSearch]=useState('');
 const [cursor,setCursor]=useState({lat:0,lon:0}),[selected,setSelected]=useState(null),[tileCount,setTileCount]=useState(0);
 const requestDraw=()=>{if(drawRef.current)cancelAnimationFrame(drawRef.current);drawRef.current=requestAnimationFrame(()=>setTileCount(n=>n+1))};
 useEffect(()=>{if(!stage.current)return;const ob=new ResizeObserver(()=>setSize({w:stage.current.clientWidth,h:stage.current.clientHeight}));ob.observe(stage.current);return()=>ob.disconnect()},[]);
 useEffect(()=>{cache.current.clear();pending.current.clear();requestDraw()},[layers.graticule]);
 useEffect(()=>{
  const el=canvas.current;if(!el)return;
  const pixelRatio=Math.min(devicePixelRatio||1,2),{w,h}=size;
  el.width=Math.max(1,Math.floor(w*pixelRatio));el.height=Math.max(1,Math.floor(h*pixelRatio));el.style.width=w+'px';el.style.height=h+'px';
  const ctx=el.getContext('2d');ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);ctx.fillStyle='#0b324c';ctx.fillRect(0,0,w,h);
  const items=visibleTiles(w,h,camera);
  const waiting=[];
  for(const t of items){
   const key=t.z+'/'+t.x+'/'+t.y+'/'+Number(layers.graticule);
   const tile=cache.current.get(key);
   if(tile){ctx.drawImage(tile,t.sx,t.sy,t.side+.4,t.side+.4)}
   else if(!pending.current.has(key)){waiting.push({key,...t});pending.current.add(key)}
  }
  if(layers.labels){
   ctx.textAlign='center';ctx.font='700 15px system-ui';ctx.lineWidth=3;ctx.strokeStyle='#10231dbb';ctx.fillStyle='white';
   const worldW=512*2**camera.zoom,worldH=worldW/2,left=(w-worldW)/2+camera.panX,top=(h-worldH)/2+camera.panY;
   for(const r of regions){let x=left+(r.lon+180)/360*worldW,y=top+(90-r.lat)/180*worldH;
    if(x>=0&&x<w&&y>=0&&y<h){ctx.strokeText(r.id,x,y);ctx.fillText(r.id,x,y)}
   }
  }
  if(waiting.length){
   // Do one tile per task, so navigation remains responsive.
   let cancelled=false;let timer;
   const step=(i)=>{
    if(cancelled||i>=waiting.length)return;
    timer=setTimeout(()=>{
     if(cancelled)return;
     const t=waiting[i];try{const image=tileImage(t.z,t.x,t.y,{graticule:layers.graticule});if(image)cache.current.put(t.key,image)}catch(e){console.error('Tile generation',e)}
     pending.current.delete(t.key);requestDraw();step(i+1);
    },0);
   };step(0);
   return()=>{cancelled=true;clearTimeout(timer);for(const t of waiting)pending.current.delete(t.key)};
  }
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
