import React from 'react';
import { Link } from 'react-router-dom';

export default function Tools() {
  return (
    <div className="app-container">
      <Link to="/" style={{color:'#9ca3af', textDecoration:'none'}}>← Retour Accueil</Link>
      
      <div style={{textAlign:'center', marginBottom:'3rem', marginTop:'1rem'}}>
        <h1 style={{fontSize:'3rem', fontWeight:'800', marginBottom:'0.5rem'}}>
          Boîte à Outils <span style={{color:'#f59e0b'}}>Expert</span>
        </h1>
        <p style={{color:'#94a3b8', fontSize:'1.2rem'}}>
          Utilitaires pour calibrer et analyser les performances CKKS.
        </p>
      </div>

      <div className="tools-grid" style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', maxWidth:'1000px', margin:'0 auto'
      }}>

        {/* CARTE 1 : OPTIMISEUR */}
        <Link to="/optimizer" style={{textDecoration:'none'}}>
          <div className="tool-card" style={cardStyle}>
            <div style={{fontSize:'3rem', marginBottom:'1rem'}}>⚡</div>
            <h2 style={{color:'white', margin:'0 0 10px 0'}}>Optimiseur de Rotations</h2>
            <p style={{color:'#9ca3af', fontSize:'0.9rem', lineHeight:'1.5'}}>
              Analysez le coût mathématique (Temps & CPU) de vos réductions.
              Comparez les stratégies <strong>Binaire</strong> vs <strong>Block-Wise</strong>.
            </p>
            <div style={{marginTop:'1rem', color:'#f59e0b', fontWeight:'bold', fontSize:'0.9rem'}}>
              Lancer l'analyse →
            </div>
          </div>
        </Link>

        {/* CARTE 2 : GÉNÉRATEUR DATA (Optionnel si tu veux le mettre là aussi) */}
       {/* CARTE 2 : GÉNÉRATEUR DATA */}
<Link to="/generator" style={{textDecoration:'none'}}> 
  <div className="tool-card" style={{...cardStyle, border:'1px solid #334155'}}>
    <div style={{fontSize:'3rem', marginBottom:'1rem'}}>🏭</div>
    <h2 style={{color:'white', margin:'0 0 10px 0'}}>Data Factory</h2>
    <p style={{color:'#9ca3af', fontSize:'0.9rem', lineHeight:'1.5'}}>
      Générez des datasets massifs (Big Data) personnalisés pour vos tests.
    </p>
    <div style={{marginTop:'1rem', color:'#3b82f6', fontWeight:'bold', fontSize:'0.9rem'}}>
      Créer un dataset →
    </div>
  </div>
</Link>

        {/* CARTE 3 : FUTURE TOOL (Placeholder) */}
               {/* CARTE 3 : SIMULATEUR DE BRUIT (ACTIVÉE) */}
        <Link to="/precision-lab" style={{textDecoration:'none'}}>
          <div className="tool-card" style={{...cardStyle, border:'1px solid #8b5cf6'}}>
            <div style={{fontSize:'3rem', marginBottom:'1rem'}}>🧪</div>
            <h2 style={{color:'white', margin:'0 0 10px 0'}}>Labo de Précision</h2>
            <p style={{color:'#9ca3af', fontSize:'0.9rem', lineHeight:'1.5'}}>
              Visualisez l'impact du paramètre <strong>Scale</strong> sur la qualité de vos calculs.
            </p>
            <div style={{marginTop:'1rem', color:'#a78bfa', fontWeight:'bold', fontSize:'0.9rem'}}>
              Tester la Précision →
            </div>
          </div>
        </Link>

      </div>
    </div>
  );
}

// Petit style inline pour les cartes
const cardStyle = {
  background: '#1e293b',
  padding: '2rem',
  borderRadius: '16px',
  border: '1px solid #475569',
  transition: 'transform 0.2s, border-color 0.2s',
  cursor: 'pointer',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  textAlign: 'center'
};