import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function DataGenerator() {
  const [count, setCount] = useState(10000);
  const [min, setMin] = useState(0);
  const [max, setMax] = useState(1000);
  const [precision, setPrecision] = useState(2); // Nombre de décimales
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    
    // Utilisation de setTimeout pour ne pas bloquer l'UI pendant la boucle
    setTimeout(() => {
      let csvContent = ""; // Pas de header pour simplifier l'ingestion CKKS
      
      for (let i = 0; i < count; i++) {
        const randomVal = (Math.random() * (max - min) + min).toFixed(precision);
        csvContent += randomVal + "\n";
      }

      // Création du fichier Blob
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      // Déclenchement du téléchargement
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `dataset_${count}_rows.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsGenerating(false);
    }, 100);
  };

  return (
    <div className="app-container">
      <Link to="/tools" style={{color:'#9ca3af', textDecoration:'none'}}>← Retour Outils</Link>
      
      <header style={{textAlign:'center', margin:'2rem 0'}}>
        <h1 style={{fontSize:'2.5rem', marginBottom:'0.5rem'}}>🏭 Data Factory</h1>
        <p style={{color:'#94a3b8'}}>
          Générez des fichiers CSV de test sur mesure pour vos benchmarks.
        </p>
      </header>

      <div style={{
        background: '#1e293b', padding: '2rem', borderRadius: '12px', 
        maxWidth: '600px', margin: '0 auto', border: '1px solid #334155'
      }}>
        
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem', marginBottom:'1.5rem'}}>
          <div>
            <label style={labelStyle}>Nombre de lignes (N)</label>
            <input type="number" value={count} onChange={e => setCount(parseInt(e.target.value))} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Précision (Décimales)</label>
            <input type="number" value={precision} onChange={e => setPrecision(parseInt(e.target.value))} style={inputStyle} />
          </div>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem', marginBottom:'2rem'}}>
          <div>
            <label style={labelStyle}>Valeur Min</label>
            <input type="number" value={min} onChange={e => setMin(parseFloat(e.target.value))} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Valeur Max</label>
            <input type="number" value={max} onChange={e => setMax(parseFloat(e.target.value))} style={inputStyle} />
          </div>
        </div>

        {/* Prévisualisation Taille */}
        <div style={{textAlign:'center', marginBottom:'2rem', color:'#64748b', fontSize:'0.9rem'}}>
           Poids estimé : <strong>~{((count * 8) / 1024 / 1024).toFixed(2)} MB</strong>
        </div>

        <button 
          onClick={handleGenerate} 
          disabled={isGenerating}
          style={{
            width: '100%', padding: '15px', borderRadius: '8px', border: 'none',
            background: isGenerating ? '#475569' : '#3b82f6', 
            color: 'white', fontSize: '1.1rem', fontWeight: 'bold', cursor: isGenerating ? 'wait' : 'pointer',
            transition: 'background 0.2s'
          }}
        >
          {isGenerating ? "Génération en cours..." : "⬇️ Générer & Télécharger CSV"}
        </button>

      </div>
    </div>
  );
}

const labelStyle = { display: 'block', color: '#94a3b8', marginBottom: '8px', fontSize: '0.9rem' };
const inputStyle = { 
  width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', 
  color: 'white', borderRadius: '6px', fontSize: '1rem' 
};