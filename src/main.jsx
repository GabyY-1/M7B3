import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './style.css';

class AppErrorBoundary extends React.Component {
  constructor(props){super(props);this.state={error:null}}
  static getDerivedStateFromError(error){return {error}}
  componentDidCatch(error,info){console.error('M7B3 rendering error:',error,info)}
  render(){
    if(this.state.error)return <div style={{padding:'36px',fontFamily:'system-ui',background:'#f2f5f7',minHeight:'100vh',color:'#243747'}}>
      <h1>M7B3 Maps</h1><p>Une erreur a empêché le chargement de la carte.</p>
      <pre style={{whiteSpace:'pre-wrap',padding:'16px',borderRadius:'12px',background:'#fff'}}>{String(this.state.error)}</pre>
      <button onClick={()=>location.reload()} style={{padding:'10px 18px',background:'#233e52',color:'#fff',border:0,borderRadius:'8px'}}>Réessayer</button>
    </div>;
    return this.props.children;
  }
}
createRoot(document.getElementById('root')).render(<AppErrorBoundary><App/></AppErrorBoundary>);
