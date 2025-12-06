import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { initSEALAndKeys, encryptData, decryptResult, getSlotCount } from '../he_client';
import { ENDPOINTS } from '../config'; 

export default function Demo() {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("Initialisation...");
  
  const [inputData, setInputData] = useState(null); // Changé en null par défaut
  const [fileInfo, setFileInfo] = useState(null); 
  const [resultMean, setResultMean] = useState(null);
  const [resultSum, setResultSum] = useState(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false); 
  const [activeStep, setActiveStep] = useState(0); 
  const logsEndRef = useRef(null);

  useEffect(() => {
    initSEALAndKeys().then(ok => {
      setStatus(ok ? "PRÊT" : "ERREUR");
      addLog(ok ? "Moteur Chiffrement Homomorphe (CKKS + SIMD) chargé." : "Erreur chargement SEAL.", ok ? "success" : "error");
    });
  }, []);

  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  const addLog = (msg, type="info") => {
    const time = new Date().toLocaleTimeString().split(' ')[0];
    setLogs(prev => [...prev, {time, msg, type}]);
  };

  // --- GÉNÉRATION BIG DATA OPTIMISÉE ---
  const generateBigData = (count) => {
    setIsGenerating(true);
    addLog(`Génération de ${count.toLocaleString()} valeurs...`, "warning");

    setTimeout(() => {
        // On utilise Float64Array directement pour économiser la RAM navigateur
        const data = new Float64Array(count);
        for(let i=0; i<count; i++) data[i] = Math.random() * 1000;
        
        setFileInfo({ 
            name: `generated_bigdata_${count/1000}k.bin`, 
            size: `${(data.byteLength / 1024 / 1024).toFixed(2)} MB`, 
            count: count 
        });
        setInputData(data); // On stocke le Float64Array, pas le string (trop lourd)
        setResultMean(null); setResultSum(null); setActiveStep(1);
        setIsGenerating(false);
        addLog(`✅ Dataset généré en RAM.`, "success");
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

  // --- PROCESSUS BATCHING (AZURE FRIENDLY) ---
  const startProcess = async () => {
    if(!inputData) return;
    setIsProcessing(true);
    setResultMean(null); setResultSum(null); setActiveStep(1);

    try {
      const totalCount = inputData.length;
      const slotCount = getSlotCount(); // Probablement 4096
      
      addLog(`Préparation Batching (Vecteurs de taille ${slotCount})...`, "info");
      
      // A. CHIFFREMENT PAR LOTS (BATCHING)
      addLog(`🔒 Chiffrement de ${totalCount.toLocaleString()} valeurs...`, "warning");
      await new Promise(r => setTimeout(r, 100)); // UI refresh

      const encryptedChunks = [];
      let processedCount = 0;
      let chunkIndex = 0;

      // Boucle par pas de 4096 (slotCount)
      for (let i = 0; i < totalCount; i += slotCount) {
        // Extraction du sous-tableau (ex: indices 0 à 4096)
        const chunk = inputData.subarray(i, i + slotCount);
        // Chiffrement du vecteur entier en 1 ciphertext
        const b64 = encryptData(chunk); 
        
        encryptedChunks.push({ index: chunkIndex++, ciphertext: b64, size: chunk.length });
        processedCount += chunk.length;
      }

      addLog(`Chiffrement terminé : ${encryptedChunks.length} vecteurs chiffrés générés.`, "success");

      // B. UPLOAD AZURE
      setActiveStep(2);
      addLog(`☁️ Envoi de ${encryptedChunks.length} paquets vers Azure...`, "warning");

      await fetch(ENDPOINTS.RESET, { method: 'POST' });

      // Envoi séquentiel pour ne pas tuer le réseau
      for(let i=0; i<encryptedChunks.length; i++) {
          await fetch(ENDPOINTS.UPLOAD_CHUNK, {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({
                  index: encryptedChunks[i].index,
                  ciphertext: encryptedChunks[i].ciphertext
              })
          });
          if(i % 10 === 0) addLog(`Upload: ${Math.round((i/encryptedChunks.length)*100)}%`, "info");
      }

      // C. COMPUTE
      addLog(`Demande de calcul Cloud...`, "warning");
      const res = await fetch(ENDPOINTS.COMPUTE_STATS, {
          method: 'POST', 
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({}) // On envoie juste l'ordre de calculer
      });
      const data = await res.json();
      
      addLog("Succès. Résultats chiffrés reçus.", "success");

      // D. DECRYPT & AGGREGATE
      setActiveStep(3);
      addLog("🔓 Déchiffrement...", "warning");

      // Le serveur renvoie un Ciphertext qui contient la SOMME des vecteurs
      // On déchiffre ce vecteur somme
      const decodedSumVector = decryptResult(data.sumCiphertext);
      
      // On doit maintenant additionner tout le contenu du vecteur déchiffré pour avoir le vrai total
      // Car Azure a fait Somme(Vecteur1) + Somme(Vecteur2)... composante par composante
      let totalSum = 0;
      // On ne somme que les 'count' premiers éléments valides si le dernier vecteur n'était pas plein
      // Mais pour simplifier, la somme de tout le vecteur fonctionne car les slots vides sont à 0
      for(let val of decodedSumVector) totalSum += val;

      const finalMean = totalSum / totalCount;

      setResultSum(totalSum.toLocaleString(undefined, { maximumFractionDigits: 2 }));
      setResultMean(finalMean.toLocaleString(undefined, { maximumFractionDigits: 4 }));

      addLog(`Terminé ! 1M de valeurs traitées.`, "success");

    } catch(e) {
      console.error(e);
      addLog("Erreur: " + e.message, "error");
    }
    setIsProcessing(false);
  };

  return (
    <div className="app-container">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
        <Link to="/" style={{color: '#9ca3af', textDecoration: 'none'}}>← Retour</Link>
        <div style={{color: status === 'PRÊT' ? '#10b981' : 'red', fontWeight: 'bold'}}>MOTEUR: {status}</div>
      </div>

      <div className="demo-layout">
        <div className="left-column">
          <div className={`box-step ${activeStep === 1 ? 'active' : ''}`}>
            <h3>1. Big Data Source</h3>
            <div style={{padding: '20px', textAlign: 'center'}}>
               {fileInfo ? (
                   <div style={{color:'#10b981', marginBottom:'20px'}}>
                       <strong>{fileInfo.name}</strong><br/>
                       {parseInt(fileInfo.count).toLocaleString()} valeurs
                   </div>
               ) : (
                   <div style={{display:'flex', gap:'10px', justifyContent:'center', marginBottom:'20px'}}>
                       <button onClick={() => generateBigData(100000)} disabled={isGenerating} style={btnStyle}>100k</button>
                       <button onClick={() => generateBigData(500000)} disabled={isGenerating} style={btnStyle}>500k</button>
                       <button onClick={() => generateBigData(1000000)} disabled={isGenerating} style={{...btnStyle, border:'1px solid red', color:'#faa'}}>1M (Azure)</button>
                   </div>
               )}
               <button onClick={startProcess} disabled={isProcessing || !inputData} style={btnActionStyle}>
                   {isProcessing ? "Traitement Cloud..." : "Lancer Azure Compute 🚀"}
               </button>
            </div>
          </div>
          
          <div className={`box-step ${activeStep === 3 ? 'active' : ''}`}>
             <h3>3. Résultats</h3>
             <div style={{display:'flex', justifyContent:'space-around'}}>
                 <div>
                     <small>MOYENNE</small>
                     <div style={{fontSize:'2rem', color:'#10b981'}}>{resultMean || "--"}</div>
                 </div>
                 <div>
                     <small>SOMME</small>
                     <div style={{fontSize:'2rem', color:'#3b82f6'}}>{resultSum || "--"}</div>
                 </div>
             </div>
          </div>
        </div>

        <div className="right-column">
            <div className="terminal-wrapper">
                <div className="terminal-content">
                    {logs.map((l, i) => (
                        <div key={i} style={{color: l.type === 'error' ? 'red' : l.type === 'success' ? '#4ade80' : '#ccc'}}>
                            {l.time} {l.msg}
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

const btnStyle = { background:'#374151', color:'white', border:'none', padding:'8px 16px', borderRadius:'4px', cursor:'pointer' };
const btnActionStyle = { width:'100%', background:'#2563eb', color:'white', border:'none', padding:'12px', borderRadius:'6px', cursor:'pointer', fontWeight:'bold' };
