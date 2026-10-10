import React,{useEffect,useMemo,useRef,useState,useCallback} from 'react';
import { Search, Layers3, Plus, Minus, Crosshair, Globe2, Map, Mountain, Waves, Compass, Info, X, PanelLeftClose, PanelLeftOpen, Check, LocateFixed, Maximize2 } from 'lucide-react';
import {createWorldCanvas, PLANET_RADIUS_KM, regions} from './map/terrain.js';

const INITIAL_LAYERS={satellite:true,graticule:false,labels:true,oceans:true,relief:true,rivers:false,islands:true,polar:true};
const ITEMS=[['graticule','Grille géographique'],['labels','Codes des continents'],['oceans','Océans et mers'],['relief','Relief terrestre'],['rivers','Hydrographie (à venir)'],['islands','Îles et archipels'],['polar','Régions polaires']];
const fmt=n=>Math.abs(n).toFixed(2)+'°';
export default function App(){
  const canvas=useRef(null),stage=useRef(null),drag=useRef(null),cached=useRef(new Map());
  const [view,setView]=useState({zoom:1,panX:0,panY:0});
  const [layers,setLayers]=useState(INITIAL_LAYERS);
  const [sidebar,setSidebar]=useState(true);
  const [panel,setPanel]=useState(false);
  const [mode,setMode]=useState('satellite');
  const [cursor,setCursor]=useState({lat:0,lon:0});
  const [search,setSearch]=useState('');
  const [selected,setSelected]=useState(null);
  const [loading,setLoading]=useState(true);
  const [size,setSize]=useState({w:1000,h:650});
  useEffect(()=>{
    const el=stage.current;if(!el)return;
    const ob=new ResizeObserver(()=>setSize({w:el.clientWidth,h:el.clientHeight}));
    ob.observe(el);return ()=>ob.disconnect();
  },[]);
  useEffect(()=>{
    setLoading(true);
    const timer=setTimeout(()=>{
      const key=[layers.graticule,layers.labels].join('-');
      if(!cached.current.has(key))cached.current.set(key,createWorldCanvas({graticule:layers.graticule,labels:layers.labels}));
      setLoading(false);
    },10);
    return ()=>clearTimeout(timer);
  },[layers.graticule,layers.labels]);
  useEffect(()=>{
    const c=canvas.current;if(!c)return;
    const ratio=Math.min(window.devicePixelRatio||1,2),w=size.w,h=size.h;
    c.width=w*ratio;c.height=h*ratio;c.style.width=w+'px';c.style.height=h+'px';
    const ctx=c.getContext('2d');ctx.scale(ratio,ratio);ctx.fillStyle='#0b2945';ctx.fillRect(0,0,w,h);
    const img=cached.current.get([layers.graticule,layers.labels].join('-'));
    if(!img)return;
    const base=Math.max(w,h*2),dw=base*view.zoom,dh=dw/2;
    const left=(w-dw)/2+view.panX,top=(h-dh)/2+view.panY;
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    ctx.drawImage(img,left,top,dw,dh);
    // subdued edge and vignette
    const grad=ctx.createLinearGradient(0,0,0,h);grad.addColorStop(0,'rgba(4,15,27,.18)');grad.addColorStop(.22,'rgba(4,15,27,0)');grad.addColorStop(.78,'rgba(4,15,27,0)');grad.addColorStop(1,'rgba(4,15,27,.18)');
    ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
  },[size,view,layers,loading]);
  const zoomBy=useCallback((factor)=>setView(p=>({...p,zoom:Math.max(1,Math.min(24,p.zoom*factor))})),[]);
  const coordAt=useCallback((e)=>{
    const r=stage.current.getBoundingClientRect(),w=size.w,h=size.h;
    const base=Math.max(w,h*2),dw=base*view.zoom,dh=dw/2;
    const u=(e.clientX-r.left-(w-dw)/2-view.panX)/dw;
    const v=(e.clientY-r.top-(h-dh)/2-view.panY)/dh;
    if(u<0||u>1||v<0||v>1)return null;
    return {lon:u*360-180,lat:90-v*180};
  },[view,size]);
  const onMove=e=>{
    if(drag.current){const dx=e.clientX-drag.current.x,dy=e.clientY-drag.current.y;drag.current={x:e.clientX,y:e.clientY};setView(v=>({...v,panX:v.panX+dx,panY:v.panY+dy}))}
    const pos=coordAt(e);if(pos)setCursor(pos);
  };
  const onSearch=e=>{
    e.preventDefault();
    const found=regions.find(x=>x.id.toLowerCase()===search.trim().toLowerCase());
    if(found){setSelected(found.id);const w=size.w,h=size.h,base=Math.max(w,h*2),zoom=2;setView({zoom,panX:-(found.lon/360)*base*zoom,panY:(found.lat/180)*base*zoom})}
  };
  const reset=()=>{setView({zoom:1,panX:0,panY:0});setSelected(null)};
  const toggle=k=>setLayers(p=>({...p,[k]:!p[k]}));
  return <div className="shell">
    {sidebar&&<aside className="sidebar">
      <div className="brand"><div className="logo"><Globe2 size={23}/></div><div><strong>M7B3 <span>Maps</span></strong><small>ATLAS PLANÉTAIRE</small></div><button className="icon-btn close-sidebar" title="Réduire le panneau" onClick={()=>setSidebar(false)}><PanelLeftClose size={19}/></button></div>
      <form className="search" onSubmit={onSearch}><Search size={18}/><input placeholder="Rechercher C1, C2, C3…" value={search} onChange={e=>setSearch(e.target.value)}/><kbd>↵</kbd></form>
      <div className="section-title">EXPLORATION</div>
      <button className={'nav-item '+(mode==='satellite'?'active':'')} onClick={()=>setMode('satellite')}><Globe2 size={18}/> Carte satellite <span className="tag">ACTIF</span></button>
      <button className={'nav-item '+(mode==='plan'?'active':'')} onClick={()=>setMode('plan')}><Map size={18}/> Carte en plan <span className="tag muted">À VENIR</span></button>
      <button className="nav-item" onClick={()=>setPanel(true)}><Layers3 size={18}/> Calques cartographiques</button>
      <div className="section-title">GÉOGRAPHIE</div>
      <div className="region-list">{regions.map(r=><button key={r.id} className={'region '+(selected===r.id?'chosen':'')} onClick={()=>{setSearch(r.id);setSelected(r.id);const base=Math.max(size.w,size.h*2),z=2;setView({zoom:z,panX:-(r.lon/360)*base*z,panY:(r.lat/180)*base*z})}}><span className="dot"/><span>Continent {r.id}</span><span className="chev">›</span></button>)}</div>
      <div className="sidebar-bottom"><Info size={17}/><span>Géographie fictive en construction<br/><b>Version initiale 0.1</b></span></div>
    </aside>}
    <main className="main">
      <header className="topbar">
        {!sidebar&&<button className="icon-btn" title="Ouvrir le menu" onClick={()=>setSidebar(true)}><PanelLeftOpen size={20}/></button>}
        <div className="crumb"><span>M7B3</span><span className="slash">/</span><b>Vue satellite</b></div>
        <div className="top-actions"><span className="live-dot"/> <span className="status">Première version</span><button onClick={()=>setPanel(true)} className="top-button"><Layers3 size={16}/> Calques</button></div>
      </header>
      <div className="map-stage" ref={stage} onPointerDown={e=>{if(e.button!==0)return;drag.current={x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={onMove} onPointerUp={()=>drag.current=null} onPointerCancel={()=>drag.current=null} onWheel={e=>{e.preventDefault();zoomBy(e.deltaY<0?1.18:1/1.18)}}>
        <canvas ref={canvas} className="map-canvas" onClick={()=>{}}/>
        <div className="map-watermark"><Globe2 size={15}/> M7B3 <span>·</span> Satellite expérimental</div>
        <div className="map-top-left"><span className="pill dark"><span className="live-dot"/> CARTE SATELLITE</span></div>
        <div className="right-controls"><div className="control-box"><button title="Zoom avant" onClick={()=>zoomBy(1.4)}><Plus size={20}/></button><button title="Zoom arrière" onClick={()=>zoomBy(1/1.4)}><Minus size={20}/></button></div><div className="control-box"><button title="Recentrer la planète" onClick={reset}><Crosshair size={20}/></button><button title="Calques" onClick={()=>setPanel(true)}><Layers3 size={20}/></button></div></div>
        <div className="bottom-map"><div className="coordinates"><Crosshair size={14}/>{fmt(cursor.lat)} {cursor.lat>=0?'N':'S'} &nbsp; {fmt(cursor.lon)} {cursor.lon>=0?'E':'O'}</div><div className="zoom-chip">Zoom {view.zoom.toFixed(1)}×</div></div>
        {loading&&<div className="loading">Génération du terrain de M7B3…</div>}
        {mode==='plan'&&<div className="notice"><Map size={18}/><div><b>Mode Plan en préparation</b><span>Disponible lorsque les pays et villes auront été définis. La carte satellite reste la carte principale.</span></div><button onClick={()=>setMode('satellite')}><X size={16}/></button></div>}
      </div>
      <footer className="footer"><div><span className="foot-mark">M7B3</span> <span className="divider">/</span> Monde fictif · R = {PLANET_RADIUS_KM.toLocaleString('fr-FR')} km</div><div>5 continents <span className="sep">·</span> 6 océans <span className="sep">·</span> 2 lunes</div></footer>
    </main>
    {panel&&<><div className="scrim" onClick={()=>setPanel(false)}/><section className="layer-panel"><div className="panel-head"><div><small>PERSONNALISATION</small><h2>Calques de la carte</h2></div><button className="icon-btn" onClick={()=>setPanel(false)}><X size={21}/></button></div><div className="panel-body"><div className="panel-subtitle">AFFICHAGE GÉOGRAPHIQUE</div>{ITEMS.map(([key,name])=><label className="layer-row" key={key}><span>{name}</span><input type="checkbox" checked={layers[key]} disabled={key==='rivers'} onChange={()=>toggle(key)}/><span className={'switch '+(layers[key]?'on':'')}>{layers[key]&&<Check size={12}/>}</span></label>)}<div className="panel-note"><Info size={18}/><span>Les contours, textures et altitudes sont générés de manière procédurale pour cette version. Les mesures géographiques exactes, le réseau hydrographique et le relief détaillé arrivent dans les prochaines étapes.</span></div></div><button className="panel-done" onClick={()=>setPanel(false)}>Terminé</button></section></>}
  </div>;
}
