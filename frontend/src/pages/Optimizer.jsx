import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ENDPOINTS } from '../config'; // <--- AJOUTER CECI

export default function Optimizer() {
  const [n, setN] = useState(100);
  const [slots, setSlots] = useState(4096);
  const [results, setResults] = useState(null);

  const runSimulation = async () => {
    try {
      // <--- UTILISER ENDPOINTS.OPTIMIZER ICI
      const res = await fetch(ENDPOINTS.OPTIMIZER, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ n, slots })
      });
      const data = await res.json();
      setResults(data);
    } catch (e) {
      console.error(e);
      alert("Erreur de connexion au serveur.");
    }
  };

  return (
    <div className="app-container" style={{maxWidth:'1000px'}}>
      <Link to="/tools" style={{color:'#9ca3af', textDecoration:'none'}}>← Retour Outils</Link>
      
      <h1 style={{fontSize:'2.5rem', marginBottom:'1rem'}}>Optimiseur de Réduction ⚡</h1>
      <p style={{color:'#94a3b8', marginBottom:'2rem'}}>
        En FHE, une <strong>Rotation</strong> coûte environ 20x plus cher qu'une <strong>Addition</strong>.
        <br/>Choisissez la meilleure stratégie selon la taille de votre Dataset.
      </p>

      {/* CONFIG PANEL */}
      <div style={{background:'#1e293b', padding:'2rem', borderRadius:'12px', display:'flex', gap:'2rem', alignItems:'end'}}>
        <div>
          <label style={{display:'block', color:'#94a3b8', marginBottom:'5px'}}>Nombre d'éléments (N)</label>
          <input type="number" value={n} onChange={e => setN(e.target.value)} 
            style={{background:'#0f172a', border:'1px solid #334155', color:'white', padding:'10px', borderRadius:'6px'}}/>
        </div>
        <div>
          <label style={{display:'block', color:'#94a3b8', marginBottom:'5px'}}>Slots Disponibles</label>
          <select value={slots} onChange={e => setSlots(e.target.value)}
            style={{background:'#0f172a', border:'1px solid #334155', color:'white', padding:'10px', borderRadius:'6px'}}>
            <option value="4096">4096</option>
            <option value="8192">8192</option>
            <option value="16384">16384</option>
          </select>
        </div>
        <button onClick={runSimulation} style={{
            background:'#f59e0b', color:'white', border:'none', padding:'12px 24px', borderRadius:'6px', fontWeight:'bold', cursor:'pointer'
        }}>
            Lancer l'Analyse de Coût ⚙️
        </button>
      </div>

      {/* RESULTS */}
      {results && (
        <div style={{marginTop:'3rem', animation:'fadeIn 0.5s'}}>
          <h2 style={{borderLeft:'4px solid #10b981', paddingLeft:'10px'}}>Recommandation : <span style={{color:'#10b981'}}>{results.recommendation}</span></h2>
          
          <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'1rem', marginTop:'2rem'}}>
            {results.strategies.map((strat, idx) => (
              <div key={idx} style={{
                background: strat.name === results.recommendation ? 'rgba(16, 185, 129, 0.1)' : '#1e293b',
                border: strat.name === results.recommendation ? '1px solid #10b981' : '1px solid #334155',
                padding:'1.5rem', borderRadius:'8px'
              }}>
                <h3 style={{marginTop:0, fontSize:'1.1rem', height:'50px'}}>{strat.name}</h3>
                <div style={{fontSize:'0.85rem', color:'#94a3b8', marginBottom:'1rem', minHeight:'40px'}}>{strat.desc}</div>
                
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'5px'}}>
                  <span>🔄 Rotations:</span>
                  <span style={{color:'#fcd34d', fontWeight:'bold'}}>{strat.rotations}</span>
                </div>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
                  <span>➕ Additions:</span>
                  <span style={{color:'#60a5fa', fontWeight:'bold'}}>{strat.additions}</span>
                </div>
                
                <div style={{borderTop:'1px solid #334155', paddingTop:'10px', textAlign:'right'}}>
                  <span style={{fontSize:'0.8rem', color:'#94a3b8'}}>Coût Est. : </span>
                  <span style={{fontSize:'1.2rem', fontWeight:'bold', color:'white'}}>{strat.totalCost}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}