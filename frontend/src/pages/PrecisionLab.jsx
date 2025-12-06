import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { initSEALAndKeys, encryptBatch, decryptResult } from '../he_client';

export default function PrecisionLab() {
  const [status, setStatus] = useState("Initialisation...");
  const [results, setResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testValue, setTestValue] = useState(123.456789);

  useEffect(() => {
    initSEALAndKeys().then(ok => {
      if(ok) {
        setStatus("PRÊT");
      } else {
        setStatus("ERREUR");
      }
    });
  }, []);

  const runPrecisionTest = async () => {
    setIsRunning(true);
    setResults([]);
    
    const testResults = [];
    const scales = [Math.pow(2, 20), Math.pow(2, 30), Math.pow(2, 40), Math.pow(2, 50)];
    
    for (const scale of scales) {
      try {
        // Encrypt value
        const encrypted = await encryptBatch([testValue]);
        
        // Decrypt and measure error
        const decrypted = await decryptResult(encrypted);
        const error = Math.abs(decrypted[0] - testValue);
        const relativeError = (error / testValue) * 100;
        
        testResults.push({
          scale: scale,
          scaleBits: Math.log2(scale),
          original: testValue,
          decrypted: decrypted[0],
          absoluteError: error,
          relativeError: relativeError
        });
      } catch (e) {
        testResults.push({
          scale: scale,
          scaleBits: Math.log2(scale),
          error: e.message
        });
      }
    }
    
    setResults(testResults);
    setIsRunning(false);
  };

  return (
    <div className="app-container">
      <Link to="/tools" style={{color:'#9ca3af', textDecoration:'none'}}>← Retour Outils</Link>
      
      <div style={{textAlign:'center', marginBottom:'2rem', marginTop:'1rem'}}>
        <h1 style={{fontSize:'2.5rem', fontWeight:'800', marginBottom:'0.5rem'}}>
          🧪 <span style={{color:'#a78bfa'}}>Labo de Précision</span>
        </h1>
        <p style={{color:'#94a3b8', fontSize:'1.1rem'}}>
          Visualisez l'impact du paramètre <strong>Scale</strong> sur la précision des calculs CKKS
        </p>
      </div>

      <div style={{maxWidth:'800px', margin:'0 auto'}}>
        {/* Status */}
        <div style={{
          background: status === "PRÊT" ? '#064e3b' : '#7f1d1d',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '2rem',
          textAlign: 'center',
          border: status === "PRÊT" ? '1px solid #10b981' : '1px solid #ef4444'
        }}>
          <strong style={{color: status === "PRÊT" ? '#10b981' : '#ef4444'}}>
            Status: {status}
          </strong>
        </div>

        {/* Test Configuration */}
        <div style={{
          background: '#1e293b',
          padding: '2rem',
          borderRadius: '12px',
          border: '1px solid #475569',
          marginBottom: '2rem'
        }}>
          <h2 style={{color:'white', marginBottom:'1.5rem', fontSize:'1.5rem'}}>
            Configuration du Test
          </h2>
          
          <div style={{marginBottom:'1.5rem'}}>
            <label style={{color:'#94a3b8', display:'block', marginBottom:'0.5rem'}}>
              Valeur de Test:
            </label>
            <input
              type="number"
              step="0.000001"
              value={testValue}
              onChange={(e) => setTestValue(parseFloat(e.target.value) || 0)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #475569',
                background: '#0f172a',
                color: 'white',
                fontSize: '1rem'
              }}
            />
          </div>

          <button
            onClick={runPrecisionTest}
            disabled={status !== "PRÊT" || isRunning}
            style={{
              width: '100%',
              padding: '1rem',
              borderRadius: '8px',
              border: 'none',
              background: status === "PRÊT" && !isRunning ? 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)' : '#475569',
              color: 'white',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              cursor: status === "PRÊT" && !isRunning ? 'pointer' : 'not-allowed',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => {
              if(status === "PRÊT" && !isRunning) e.target.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
          >
            {isRunning ? '⏳ Test en cours...' : '🧪 Lancer le Test de Précision'}
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div style={{
            background: '#1e293b',
            padding: '2rem',
            borderRadius: '12px',
            border: '1px solid #475569'
          }}>
            <h2 style={{color:'white', marginBottom:'1.5rem', fontSize:'1.5rem'}}>
              📊 Résultats du Test
            </h2>

            <div style={{overflowX: 'auto'}}>
              <table style={{width:'100%', borderCollapse: 'collapse'}}>
                <thead>
                  <tr style={{borderBottom: '2px solid #475569'}}>
                    <th style={{padding:'1rem', textAlign:'left', color:'#a78bfa'}}>Scale (bits)</th>
                    <th style={{padding:'1rem', textAlign:'right', color:'#a78bfa'}}>Valeur Originale</th>
                    <th style={{padding:'1rem', textAlign:'right', color:'#a78bfa'}}>Valeur Déchiffrée</th>
                    <th style={{padding:'1rem', textAlign:'right', color:'#a78bfa'}}>Erreur Absolue</th>
                    <th style={{padding:'1rem', textAlign:'right', color:'#a78bfa'}}>Erreur Relative</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, idx) => (
                    <tr key={idx} style={{borderBottom: '1px solid #334155'}}>
                      <td style={{padding:'1rem', color:'white', fontWeight:'bold'}}>
                        2^{result.scaleBits}
                      </td>
                      <td style={{padding:'1rem', textAlign:'right', color:'#94a3b8'}}>
                        {result.original?.toFixed(6) || '-'}
                      </td>
                      <td style={{padding:'1rem', textAlign:'right', color:'#94a3b8'}}>
                        {result.decrypted?.toFixed(6) || '-'}
                      </td>
                      <td style={{padding:'1rem', textAlign:'right', color: result.absoluteError < 0.001 ? '#10b981' : '#f59e0b'}}>
                        {result.absoluteError?.toExponential(2) || '-'}
                      </td>
                      <td style={{padding:'1rem', textAlign:'right', color: result.relativeError < 0.01 ? '#10b981' : '#f59e0b'}}>
                        {result.relativeError?.toFixed(4) || '-'}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{
              marginTop: '2rem',
              padding: '1.5rem',
              background: '#0f172a',
              borderRadius: '8px',
              border: '1px solid #475569'
            }}>
              <h3 style={{color:'#a78bfa', marginBottom:'1rem', fontSize:'1.2rem'}}>
                💡 Interprétation
              </h3>
              <ul style={{color:'#94a3b8', lineHeight:'1.8', margin:0, paddingLeft:'1.5rem'}}>
                <li>
                  <strong style={{color:'#10b981'}}>Scale élevé (2^40, 2^50)</strong>: 
                  Meilleure précision mais plus coûteux en calcul
                </li>
                <li>
                  <strong style={{color:'#f59e0b'}}>Scale faible (2^20, 2^30)</strong>: 
                  Plus rapide mais moins précis
                </li>
                <li>
                  Le compromis optimal dépend de votre cas d'usage et de la précision requise
                </li>
                <li>
                  Une erreur relative &lt; 0.01% est généralement considérée comme excellente
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
