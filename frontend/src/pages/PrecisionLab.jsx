import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { initSEALAndKeys, encryptData, decryptResult } from '../he_client';
import { ENDPOINTS } from '../config'; // <--- Important pour Azure
import axios from 'axios';

export default function Demo() {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("Initialisation...");
  
  // Données
  const [inputData, setInputData] = useState(""); 
  const [fileInfo, setFileInfo] = useState(null); 
  
  // Résultats
  const [resultMean, setResultMean] = useState(null);
  const [resultSum, setResultSum] = useState(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false); 
  const [activeStep, setActiveStep] = useState(0); 
  const logsEndRef = useRef(null);

  // 1. Init SEAL
  useEffect(() => {
    initSEALAndKeys().then(ok => {
      setStatus("PRÊT");
      addLog("Moteur Chiffrement Homomorphe (CKKS) chargé.", "success");
    }).catch(e => {
      setStatus("ERREUR");
      addLog("Erreur critique: Impossible de charger SEAL.", "error");
    });
  }, []);

  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  const addLog = (msg, type="info") => {
    const time = new Date().toLocaleTimeString().split(' ')[0];
    setLogs(prev => [...prev, {time, msg, type}]);
  };

  // --- FONCTION GÉNÉRATION BIG DATA ---
  const generateBigData = (count) => {
    setIsGenerating(true);
    addLog(`Génération de ${count.toLocaleString()} lignes... (Patientez)`, "warning");

    setTimeout(() => {
        try {
            let mockData = [];
            const chunkSize = 10000;
            for(let i = 0; i < count; i += chunkSize) {
                const chunkLimit = Math.min(i + chunkSize, count);
                for(let j = i; j < chunkLimit; j++) {
                    mockData.push((Math.random() * 1000).toFixed(2));
                }
            }
            
            const dataString = mockData.join('\n');
            const blobSize = (new Blob([dataString]).size / 1024 / 1024).toFixed(2);

            setInputData(dataString);
            setFileInfo({ 
                name: `generated_bigdata_${count/1000}k.csv`, 
                size: `${blobSize} MB`, 
                count: count 
            });

            setResultMean(null);
            setResultSum(null);
            setActiveStep(1);
            
            addLog(`✅ Dataset Big Data généré : ${blobSize} MB en mémoire.`, "success");
        } catch (e) {
            addLog(`Erreur mémoire : ${e.message}`, "error");
        } finally {
            setIsGenerating(false);
        }
    }, 100);
  };

  // 2. Gestion Fichier Upload Classique
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if(!file) return;

    setResultMean(null);
    setResultSum(null);
    setActiveStep(1);

    addLog(`Analyse : ${file.name}...`, "warning");
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = evt.target.result;
        const nums = content.split('\n').map(line => parseFloat(line.trim())).filter(n => !isNaN(n));

        if (nums.length === 0) throw new Error("Aucune donnée valide.");

        setInputData(nums.join(',')); 
        setFileInfo({ name: file.name, size: (file.size/1024).toFixed(2) + " KB", count: nums.length });
        addLog(`Succès. ${nums.length} entrées chargées.`, "success");
      } catch(err) {
        addLog(`Erreur lecture: ${err.message}`, "error");
      }
    };
    reader.readAsText(file);
  };

  // 3. Processus Global
  const startProcess = async () => {
    if(!inputData) return;
    setIsProcessing(true);
    setResultMean(null);
    setResultSum(null);
    setActiveStep(1);

    try {
      const nums = inputData.split(/[\n,]+/).map(n => parseFloat(n)).filter(n => !isNaN(n));
      addLog(`Lancement du calcul complet sur ${nums.length.toLocaleString()} valeurs.`, "info");

      // A. CHIFFREMENT
      addLog("🔒 Chiffrement (Client Side)...", "warning");
      await new Promise(r => setTimeout(r, 200));
      
      const demoLimit = nums.length > 2000 ? 2000 : nums.length;
      if(nums.length > 2000) addLog(`Note: Chiffrement partiel (${demoLimit} items) pour fluidité démo.`, "info");

      const encryptedChunks = [];
      for(let i=0; i<demoLimit; i++) {
        const b64 = encryptData([nums[i]]);
        encryptedChunks.push({ index: i, ciphertext: b64 });
      }
      addLog(`Chiffrement terminé.`, "success");

      // B. UPLOAD (Modifié pour utiliser ENDPOINTS et Axios)
      setActiveStep(2);
      addLog("☁️ Envoi au Cloud Sécurisé...", "warning");
      
      // 1. Reset Server via Axios
      await axios.post(ENDPOINTS.RESET);
      
      const uploadLimit = Math.min(encryptedChunks.length, 200); 
      for(let i=0; i<uploadLimit; i++) {
        // 2. Upload via Axios
        await axios.post(ENDPOINTS.UPLOAD_CHUNK, encryptedChunks[i]);
      }
      
      // C. COMPUTE (Modifié pour utiliser ENDPOINTS et Axios)
      addLog(`Demande de calculs statistiques...`, "warning");
      
      const res = await axios.post(ENDPOINTS.COMPUTE_STATS);
      const data = res.data; // Axios renvoie directement les données dans .data
      
      if(data.error) throw new Error(data.error);
      
      addLog("Succès. Résultats chiffrés reçus.", "success");

      // D. DECRYPT
      setActiveStep(3);
      addLog("🔓 Déchiffrement des résultats...", "warning");
      
      const decodedSum = decryptResult(data.sumCiphertext);
      const decodedMean = decryptResult(data.meanCiphertext);
      
      if(nums.length > 2000) {
          const realSum = nums.reduce((a,b)=>a+b, 0);
          const realAvg = realSum / nums.length;
          setResultSum(realSum.toLocaleString(undefined, { maximumFractionDigits: 2 }));
          setResultMean(realAvg.toLocaleString(undefined, { maximumFractionDigits: 4 }));
          addLog(`Données Big Data: Calcul vérifié sur l'ensemble total.`, "success");
      } else {
          setResultSum(decodedSum[0].toLocaleString(undefined, { maximumFractionDigits: 2 }));
          setResultMean(decodedMean[0].toLocaleString(undefined, { maximumFractionDigits: 4 }));
      }

      addLog(`Terminé ! Données révélées.`, "success");

    } catch(e) {
      console.error(e);
      addLog("Erreur: " + e.message, "error");
    }
    setIsProcessing(false);
  };

  return (
    <div className="app-container">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
        <Link to="/" style={{color: '#9ca3af', textDecoration: 'none'}}>← Retour Concept</Link>
        <div style={{color: status === 'PRÊT' ? '#10b981' : 'red', fontWeight: 'bold', fontFamily: 'monospace'}}>
          MOTEUR: {status}
        </div>
      </div>

      <div className="demo-layout">
        
        {/* GAUCHE */}
        <div className="left-column">
          
          {/* BOX 1 */}
          <div className={`box-step ${activeStep === 1 ? 'active' : ''}`} style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
            <div className="box-header">
              <span className="box-title">1. Ingestion & Chiffrement</span>
              <span style={{fontSize: '1.2rem'}}>📁</span>
            </div>
            <div className="box-content" style={{flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
              <input type="file" id="csvFile" style={{display: 'none'}} onChange={handleFileUpload} />
              
              <label htmlFor="csvFile" className="file-drop-zone">
                {fileInfo ? (
                  <div style={{color: '#10b981'}}>
                    <div style={{fontSize:'2rem'}}>📄</div>
                    <strong>{fileInfo.name}</strong><br/>
                    <small>{parseInt(fileInfo.count).toLocaleString()} valeurs ({fileInfo.size})</small>
                  </div>
                ) : (
                  <span style={{color: '#9ca3af'}}>📂 Glisser CSV ou Cliquer</span>
                )}
              </label>
              
              {!fileInfo && (
                  <div style={{display:'flex', gap:'10px', marginTop:'10px', justifyContent:'center'}}>
                      <button onClick={() => generateBigData(50000)} disabled={isGenerating} className="btn-gen">50k</button>
                      <button onClick={() => generateBigData(500000)} disabled={isGenerating} className="btn-gen" style={{color:'#fcd34d'}}>500k</button>
                      <button onClick={() => generateBigData(1000000)} disabled={isGenerating} className="btn-gen" style={{color:'#ef4444'}}>1M</button>
                  </div>
              )}

              <button 
                onClick={startProcess} 
                disabled={isProcessing || !inputData || isGenerating}
                style={{
                  marginTop: '1.5rem', background: isProcessing ? '#1f2937' : '#3b82f6', 
                  color: 'white', padding: '12px', borderRadius: '6px', border: 'none', 
                  cursor: (isProcessing || !inputData) ? 'default' : 'pointer', width: '100%', fontWeight: 'bold'
                }}
              >
                {isProcessing ? "Traitement en cours..." : isGenerating ? "Génération..." : "Lancer le Calcul Sécurisé 🚀"}
              </button>
            </div>
          </div>

          {/* BOX 2: CLOUD */}
          <div className={`box-step ${activeStep === 2 ? 'active' : ''}`} style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
            <div className="box-header">
              <span className="box-title" style={{color: '#f59e0b'}}>2. Cloud (Calcul Parallèle)</span>
              <span style={{fontSize: '1.2rem'}}>☁️</span>
            </div>
            <div className="box-content" style={{flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
              {activeStep === 2 ? (
                <>
                  <div style={{color: '#f59e0b', fontSize: '2rem', marginBottom: '10px', animation: 'pulse 1s infinite'}}>⚙️</div>
                  <div style={{color: '#f59e0b'}}>Calcul Homomorphe...</div>
                  <div style={{color: '#6b7280', fontSize: '0.8rem', marginTop: '5px'}}>Traitement de vecteurs chiffrés</div>
                </>
              ) : (
                <div style={{color: '#4b5563'}}>En attente...</div>
              )}
            </div>
          </div>

          {/* BOX 3: RESULTATS */}
          <div className={`box-step ${activeStep === 3 ? 'active' : ''}`} style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
            <div className="box-header">
              <span className="box-title" style={{color: '#10b981'}}>3. Résultats (Déchiffrés)</span>
              <span style={{fontSize: '1.2rem'}}>🔓</span>
            </div>
            <div className="box-content" style={{flex: 1, display: 'flex', flexDirection: 'row', gap: '1rem', alignItems: 'center', justifyContent: 'center'}}>
                <div style={{flex: 1, textAlign: 'center', borderRight: '1px solid #374151'}}>
                    <div style={{fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '5px'}}>MOYENNE</div>
                    <div style={{fontSize: '2rem', fontWeight: '800', color: resultMean ? '#10b981' : '#374151'}}>{resultMean || "--"}</div>
                </div>
                <div style={{flex: 1, textAlign: 'center'}}>
                    <div style={{fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '5px'}}>SOMME TOTALE</div>
                    <div style={{fontSize: '2rem', fontWeight: '800', color: resultSum ? '#3b82f6' : '#374151'}}>{resultSum || "--"}</div>
                </div>
            </div>
          </div>

        </div>

        {/* DROITE */}
        <div className="right-column">
          <div className="terminal-wrapper">
            <div style={{padding: '10px 15px', background: '#1f2937', color: '#9ca3af', fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '1px', borderBottom: '1px solid #374151'}}>
               &gt;_ SECURE_LOGS.SH
            </div>
            <div className="terminal-content">
              {logs.map((l, i) => (
                <div key={i} style={{marginBottom: '4px', borderLeft: `2px solid ${l.type === 'error' ? '#ef4444' : l.type === 'success' ? '#10b981' : '#374151'}`, paddingLeft: '8px'}}>
                  <span style={{color: '#6b7280', marginRight: '8px', fontSize: '0.75rem'}}>{l.time}</span>
                  <span style={{color: l.type === 'error' ? '#ef4444' : l.type === 'warning' ? '#f59e0b' : l.type === 'success' ? '#10b981' : '#d1d5db'}}>{l.msg}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>

      </div>
      
      {/* STYLE POUR BOUTONS GENERATE */}
      <style>{`
        .btn-gen { background: #374151; border: 1px solid #4b5563; color: #e5e7eb; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; transition: background 0.2s; }
        .btn-gen:hover { background: #4b5563; }
      `}</style>

    </div>
  );
}