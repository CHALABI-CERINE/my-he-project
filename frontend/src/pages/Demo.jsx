import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
// On importe encryptBatch au lieu de encryptData pour le support Big Data
import { initSEALAndKeys, encryptBatch, decryptResult, getBatchSize } from '../he_client';
import { ENDPOINTS } from '../config'; 

export default function Demo() {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("Initialisation...");
  
  const [inputData, setInputData] = useState(null); 
  const [fileInfo, setFileInfo] = useState(null); 
  
  const [resultMean, setResultMean] = useState(null);
  const [resultSum, setResultSum] = useState(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false); 
  const [activeStep, setActiveStep] = useState(0); 
  const logsEndRef = useRef(null);

  useEffect(() => {
    initSEALAndKeys().then(ok => {
      if(ok) {
        setStatus("PRÊT");
        addLog("Moteur Chiffrement Homomorphe (CKKS) chargé.", "success");
      } else {
        setStatus("ERREUR");
        addLog("Erreur critique: Impossible de charger SEAL.", "error");
      }
    });
  }, []);

  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  const addLog = (msg, type="info") => {
    const time = new Date().toLocaleTimeString().split(' ')[0];
    setLogs(prev => [...prev, {time, msg, type}]);
  };

  const generateBigData = (count) => {
    setIsGenerating(true);
    addLog(`Génération de ${count.toLocaleString()} lignes...`, "warning");
    setTimeout(() => {
        try {
            // Utilisation de Float64Array pour performance
            const data = new Float64Array(count);
            for(let i = 0; i < count; i++) {
                data[i] = Math.random() * 100;
            }
            
            const sizeMB = (data.byteLength / 1024 / 1024).toFixed(2);

            setInputData(data);
            setFileInfo({ 
                name: `generated_${count/1000}k.bin`, 
                size: `${sizeMB} MB`, 
                count: count 
            });
            setActiveStep(1);
            addLog(`✅ Données générées en RAM : ${sizeMB} MB.`, "success");
        } catch (e) {
            addLog(`Erreur mémoire : ${e.message}`, "error");
        } finally {
            setIsGenerating(false);
        }
    }, 100);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    addLog(`Lecture : ${file.name}...`, "warning");
    
    const reader = new FileReader();
    reader.onload = (evt) => {
        const txt = evt.target.result;
        const nums = txt.split(/[\n,]+/).map(n => parseFloat(n.trim())).filter(n => !isNaN(n));
        setInputData(new Float64Array(nums));
        setFileInfo({ name: file.name, size: (file.size/1024).toFixed(2) + " KB", count: nums.length });
        addLog(`${nums.length} entrées chargées.`, "success");
    };
    reader.readAsText(file);
  };

  const startProcess = async () => {
    if(!inputData) return;
    setIsProcessing(true);
    setResultMean(null);
    setResultSum(null);
    setActiveStep(1);

    try {
      const totalCount = inputData.length;
      addLog(`Préparation Big Data : ${totalCount.toLocaleString()} valeurs.`, "info");

      // --- A. CHIFFREMENT PAR BATCH (Vector Packing) ---
      addLog("🔒 Chiffrement Vectoriel (Batching)...", "warning");
      await new Promise(r => setTimeout(r, 100)); 

      const BATCH_SIZE = getBatchSize(); // 4096
      const encryptedChunks = [];
      
      // Découpage en blocs de 4096
      for (let i = 0; i < totalCount; i += BATCH_SIZE) {
          const chunk = inputData.subarray(i, i + BATCH_SIZE);
          
          // Chiffre 4096 nombres en UNE opération
          const b64 = encryptBatch(chunk);
          
          encryptedChunks.push({ 
              index: encryptedChunks.length, 
              ciphertext: b64,
              size: chunk.length 
          });

          // Feedback UI tous les 20 chunks pour éviter de freezer
          if (encryptedChunks.length % 20 === 0) {
              addLog(`Batch ${encryptedChunks.length} chiffré...`, "info");
              await new Promise(r => setTimeout(r, 0));
          }
      }
      addLog(`Chiffrement terminé : ${encryptedChunks.length} vecteurs créés.`, "success");

      // --- B. UPLOAD VERS AZURE ---
      setActiveStep(2);
      addLog("☁️ Envoi des vecteurs vers Azure...", "warning");
      
      await fetch(ENDPOINTS.RESET, { method: 'POST' });

      // Envoi séquentiel par paquets de 5 pour stabilité réseau
      const uploadBatchSize = 5;
      for (let i = 0; i < encryptedChunks.length; i += uploadBatchSize) {
          const batch = encryptedChunks.slice(i, i + uploadBatchSize);
          await Promise.all(batch.map(chunk => 
              fetch(ENDPOINTS.UPLOAD_CHUNK, {
                  method: 'POST',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify(chunk)
              })
          ));
          // Feedback visuel progression
          if (i % 20 === 0) addLog(`Transfert Cloud: ${Math.round((i/encryptedChunks.length)*100)}%`, "info");
      }

      // --- C. CALCUL ---
      addLog(`Demande de calcul sur Azure...`, "warning");
      const res = await fetch(ENDPOINTS.COMPUTE_STATS, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({}) 
      });
      
      const data = await res.json();
      if(data.error) throw new Error(data.error);
      
      addLog("Résultats chiffrés reçus du Cloud.", "success");

      // --- D. DÉCHIFFREMENT ---
      setActiveStep(3);
      addLog("🔓 Déchiffrement final...", "warning");
      
      // Récupération du vecteur Somme (déchiffré)
      const decodedSumVec = decryptResult(data.sumCiphertext);
      
      // Calcul de la somme totale (Agrégation finale client-side)
      let finalSum = 0;
      for(let val of decodedSumVec) finalSum += val;

      // Calcul moyenne
      const finalMean = finalSum / totalCount;

      setResultSum(finalSum.toLocaleString(undefined, { maximumFractionDigits: 2 }));
      setResultMean(finalMean.toLocaleString(undefined, { maximumFractionDigits: 4 }));

      addLog(`Succès ! Analyse sur ${totalCount} valeurs terminée.`, "success");

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
        <div className="left-column">
          <div className={`box-step ${activeStep === 1 ? 'active' : ''}`} style={{flex: 1}}>
            <div className="box-header"><span>1. Ingestion Big Data</span><span>📁</span></div>
            <div className="box-content">
               {!fileInfo && (
                  <div style={{display:'flex', gap:'10px', marginBottom:'15px', justifyContent:'center'}}>
                      <button onClick={() => generateBigData(100000)} disabled={isGenerating} style={btnGenStyle}>100k</button>
                      <button onClick={() => generateBigData(500000)} disabled={isGenerating} style={{...btnGenStyle, color:'#fcd34d'}}>500k</button>
                      <button onClick={() => generateBigData(1000000)} disabled={isGenerating} style={{...btnGenStyle, color:'#ef4444'}}>1M (Azure)</button>
                  </div>
               )}
               {fileInfo && <div style={{textAlign:'center', color:'#10b981', marginBottom:'10px'}}><strong>{fileInfo.name}</strong><br/><small>{fileInfo.size}</small></div>}
               <button onClick={startProcess} disabled={isProcessing || !inputData} style={btnActionStyle}>
                 {isProcessing ? "Traitement..." : "Lancer Calcul Sécurisé"}
               </button>
            </div>
          </div>

          <div className={`box-step ${activeStep === 3 ? 'active' : ''}`} style={{flex: 1}}>
             <div className="box-header"><span style={{color:'#10b981'}}>3. Résultats</span><span>🔓</span></div>
             <div className="box-content" style={{display:'flex', justifyContent:'space-around'}}>
                <div style={{textAlign:'center'}}>
                    <div style={{fontSize:'0.7rem'}}>MOYENNE</div>
                    <div style={{fontSize:'1.5rem', fontWeight:'bold', color:'#10b981'}}>{resultMean || "--"}</div>
                </div>
                <div style={{textAlign:'center'}}>
                    <div style={{fontSize:'0.7rem'}}>SOMME</div>
                    <div style={{fontSize:'1.5rem', fontWeight:'bold', color:'#3b82f6'}}>{resultSum || "--"}</div>
                </div>
             </div>
          </div>
        </div>

        <div className="right-column">
          <div className="terminal-wrapper">
            <div style={{padding: '5px 10px', background: '#1f2937', color: '#9ca3af', fontSize: '0.7rem'}}>LOGS</div>
            <div className="terminal-content">
              {logs.map((l, i) => (
                <div key={i} style={{fontSize:'0.75rem', color: l.type==='error'?'#ef4444':l.type==='success'?'#10b981':'#d1d5db'}}>
                   [{l.time}] {l.msg}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const btnGenStyle = { background:'#374151', border:'1px solid #4b5563', color:'#e5e7eb', padding:'5px', borderRadius:'4px', cursor:'pointer', flex:1 };
const btnActionStyle = { background:'#3b82f6', color:'white', padding:'10px', border:'none', borderRadius:'6px', width:'100%', cursor:'pointer' };
