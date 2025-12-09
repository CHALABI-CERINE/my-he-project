import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
// Import des fonctions de chiffrement par lot, y compris getBatchSize
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
            if(ok) { setStatus("PRÊT"); addLog("Moteur Chiffrement Homomorphe (CKKS) chargé.", "success"); }
            else { setStatus("ERREUR"); addLog("Erreur critique: Impossible de charger SEAL.", "error"); }
        });
    }, []);

    useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

    const addLog = (msg, type="info") => {
        const time = new Date().toLocaleTimeString().split(' ')[0];
        setLogs(prev => [...prev, {time, msg, type}]);
    };

    const generateBigData = (count) => {
        setIsGenerating(true);
        addLog(`Génération de ${count.toLocaleString()} lignes... (Patientez)`, "warning");

        setTimeout(() => {
            try {
                const data = new Float64Array(count);
                for(let i=0; i<count; i++) data[i] = Number((Math.random() * 1000).toFixed(2));
                
                setInputData(data);
                setFileInfo({ name: `generated_bigdata_${count/1000}k`, size: "RAM", count });
                setResultMean(null);
                setResultSum(null);
                setActiveStep(1);
                
                addLog(`✅ Dataset Big Data généré : ${count.toLocaleString()} entrées en mémoire.`, "success");
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

        setResultMean(null);
        setResultSum(null);
        setActiveStep(1);

        addLog(`Analyse : ${file.name}...`, "warning");
        
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const content = evt.target.result;
                const numsArray = content.split(/[\n,]+/).map(line => parseFloat(line.trim())).filter(n => !isNaN(n));

                if (numsArray.length === 0) throw new Error("Aucune donnée valide.");

                setInputData(new Float64Array(numsArray));
                setFileInfo({ name: file.name, size: (file.size/1024).toFixed(2) + " KB", count: numsArray.length });
                addLog(`Succès. ${numsArray.length} entrées chargées.`, "success");
            } catch(err) {
                addLog(`Erreur lecture: ${err.message}`, "error");
            }
        };
        reader.readAsText(file);
    };

    const startProcess = async () => {
        if(!inputData) {
            addLog("Aucune donnée : chargez un fichier ou générez un dataset.", "error");
            return;
        }
        setIsProcessing(true);
        setResultMean(null);
        setResultSum(null);
        setActiveStep(1);

        try {
            const dataToProcess = inputData;
            addLog(`Lancement du calcul complet sur ${dataToProcess.length.toLocaleString()} valeurs.`, "info");

            // A. Chiffrement par lots
            addLog("🔒 Chiffrement par lots (Client Side)...", "warning");
            const BATCH_SIZE = getBatchSize(); 
            const localEncrypted = [];

            for(let i=0; i < dataToProcess.length; i += BATCH_SIZE) {
                const chunk = dataToProcess.subarray(i, i + BATCH_SIZE);
                const b64 = await encryptBatch(chunk);
                localEncrypted.push({ index: localEncrypted.length, ciphertext: b64 });
            }
            addLog(`Chiffrement terminé. ${localEncrypted.length} paquets chiffrés générés.`, "success");

            // B. Upload
            setActiveStep(2);
            addLog("☁️ Envoi au Cloud Sécurisé (par lots)...", "warning");
            
            await axios.post(ENDPOINTS.RESET);

            const UPLOAD_BATCH_SIZE = 5; 
            for (let i = 0; i < localEncrypted.length; i += UPLOAD_BATCH_SIZE) {
                const batch = localEncrypted.slice(i, i + UPLOAD_BATCH_SIZE);
                await Promise.all(batch.map(c => axios.post(ENDPOINTS.UPLOAD_CHUNK, c)));
            }
            addLog(`Données envoyées au cloud.`, "success");

            // C. Compute
            addLog(`Demande de calculs statistiques...`, "warning");
            const res = await axios.post(ENDPOINTS.COMPUTE_STATS);
            const data = res.data; 
            
            if(data.error) throw new Error(data.error);
            addLog("Succès. Résultats chiffrés reçus.", "success");

            // D. Déchiffrement et aggregation défensive
            setActiveStep(3);
            addLog("🔓 Déchiffrement des résultats...", "warning");
            
            // Debug: log server payload
            console.log('server response compute:', data);
            addLog('Debug: réception résultats (voir console)', 'info');

            const decodedSumVector = await decryptResult(data.sumCiphertext);
            const decodedMeanVector = await decryptResult(data.meanCiphertext);

            // Debug: log decrypted raw vectors
            console.log('decodedSumVector (raw):', decodedSumVector);
            console.log('decodedMeanVector (raw):', decodedMeanVector);
            addLog('Debug: déchiffrage effectué (voir console pour contenu)', 'info');

            // Normalize to number[] safely
            const normArray = (v) => {
                if (v == null) return [];
                const arr = Array.isArray(v) ? v : [v];
                return arr.map(x => {
                    const n = Number(x);
                    return Number.isFinite(n) ? n : NaN;
                }).filter(n => !Number.isNaN(n));
            };

            const normDecodedSum = normArray(decodedSumVector);
            const normDecodedMean = normArray(decodedMeanVector);

            // Heuristic: if all slots equal -> use that value (common when server replicates)
            const deriveValue = (nums, preferAverage=false) => {
                if (!nums || nums.length === 0) return null;
                const allEqual = nums.every(n => n === nums[0]);
                if (allEqual) return nums[0];
                if (preferAverage) return nums.reduce((a,b)=>a+b,0) / nums.length;
                return nums.reduce((a,b)=>a+b,0);
            };

            const totalSum = deriveValue(normDecodedSum, false);
            const finalMean = deriveValue(normDecodedMean, true);

            // Final safeguarding: if not numeric, set null
            setResultSum(Number.isFinite(totalSum) ? totalSum : null);
            setResultMean(Number.isFinite(finalMean) ? finalMean : null);

            addLog(`Terminé ! Données traitées et résultats reçus.`, "success");

        } catch(e) {
            console.error(e);
            addLog("Erreur de connexion ou de calcul: " + (e.message || e), "error");
        }
        setIsProcessing(false);
    };

    // Téléchargement des résultats (JSON)
    const downloadResults = () => {
        if(resultMean == null && resultSum == null) return;
        const payload = {
            mean: resultMean,
            sum: resultSum,
            count: fileInfo?.count || (inputData ? inputData.length : null),
            timestamp: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (fileInfo?.name ? `${fileInfo.name}.results.json` : 'results.json');
        a.click();
        URL.revokeObjectURL(url);
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
                    <div className={`box-step ${activeStep === 1 ? 'active' : ''}`} style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
                        <div className="box-header">
                            <span className="box-title">1. Ingestion & Chiffrement</span>
                            <span style={{fontSize: '1.2rem'}}>📁</span>
                        </div>
                        <div className="box-content" style={{flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12}}>
                            <input type="file" id="csvFile" style={{display: 'none'}} onChange={handleFileUpload} />
                            <div style={{display:'flex', gap:8, justifyContent:'center', alignItems:'center'}}>
                                <label htmlFor="csvFile" style={{padding:12, background:'#111827', color:'#e5e7eb', borderRadius:6, cursor:'pointer'}}>Choisir un fichier</label>

                                <button onClick={() => generateBigData(50000)} disabled={isGenerating} className="btn-gen">50k</button>
                                <button onClick={() => generateBigData(500000)} disabled={isGenerating} className="btn-gen">500k</button>
                                <button onClick={() => generateBigData(1000000)} disabled={isGenerating} className="btn-gen">1M</button>

                                <button 
                                    onClick={startProcess} 
                                    disabled={isProcessing || !inputData || isGenerating}
                                    style={{
                                        background: isProcessing ? '#1f2937' : '#3b82f6', 
                                        color: 'white', padding: '12px', borderRadius: '6px', border: 'none',
                                        cursor: (isProcessing || !inputData) ? 'default' : 'pointer', fontWeight: 'bold'
                                    }}
                                >
                                    {isProcessing ? "Traitement en cours..." : isGenerating ? "Génération..." : "Lancer & Upload 🚀"}
                                </button>

                                <button
                                    onClick={downloadResults}
                                    disabled={resultMean == null && resultSum == null}
                                    style={{
                                        padding: '10px 14px',
                                        borderRadius: 6,
                                        background: (resultMean == null && resultSum == null) ? '#334155' : '#10b981',
                                        color: 'white',
                                        border: 'none',
                                        cursor: (resultMean == null && resultSum == null) ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    Télécharger résultats
                                </button>
                            </div>
                            <div style={{textAlign:'center', color:'#9ca3af', fontSize:'.9rem', marginTop:8}}>
                                {fileInfo ? `${fileInfo.name} — ${fileInfo.count?.toLocaleString?.() || ''} valeurs` : 'Aucun fichier chargé'}
                            </div>
                        </div>
                    </div>

                    <div className={`box-step ${activeStep === 2 ? 'active' : ''}`} style={{flex: 1, display: 'flex', flexDirection: 'column', marginTop: 12}}>
                        <div className="box-header">
                            <span className="box-title" style={{color: '#f59e0b'}}>2. Cloud (Calcul Parallèle)</span>
                            <span style={{fontSize: '1.2rem'}}>☁️</span>
                        </div>
                        <div className="box-content" style={{padding:12, color:'#9ca3af'}}>
                            {activeStep === 2 ? 'Envoi en cours...' : 'En attente d\'action...'}
                        </div>
                    </div>

                    <div className={`box-step ${activeStep === 3 ? 'active' : ''}`} style={{flex: 1, display: 'flex', flexDirection: 'column', marginTop: 12}}>
                        <div className="box-header">
                            <span className="box-title" style={{color: '#10b981'}}>3. Statut Résultats</span>
                        </div>
                        {/* BOX 3: n'affiche que les résultats, avec défilement horizontal si besoin */}
                        <div className="box-content" style={{padding:12, color:'#9ca3af'}}>
                            <div style={{overflowX: 'auto', whiteSpace: 'nowrap', display: 'flex', gap: 16, alignItems: 'center'}}>
                                <div style={{minWidth:220, display:'inline-block', padding:8, borderRadius:6, background:'#071027', color:'#a7f3d0'}}>
                                    <div style={{fontSize:12, color:'#94a3b8'}}>MOYENNE</div>
                                    <div style={{fontSize:20, fontWeight:800}}>{resultMean != null ? Number(resultMean).toLocaleString(undefined, { maximumFractionDigits: 4 }) : '--'}</div>
                                </div>

                                <div style={{minWidth:220, display:'inline-block', padding:8, borderRadius:6, background:'#071027', color:'#bfdbfe'}}>
                                    <div style={{fontSize:12, color:'#94a3b8'}}>SOMME TOTALE</div>
                                    <div style={{fontSize:20, fontWeight:800}}>{resultSum != null ? Number(resultSum).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '--'}</div>
                                </div>

                                <div style={{minWidth:160, display:'inline-block', padding:8, borderRadius:6, background:'#071027', color:'#c7c7c7'}}>
                                    <div style={{fontSize:12, color:'#94a3b8'}}>COUNT</div>
                                    <div style={{fontSize:16, fontWeight:700}}>{fileInfo?.count ? fileInfo.count.toLocaleString() : (inputData ? inputData.length.toLocaleString() : '--')}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="right-column">
                    <div className="terminal-wrapper">
                        <div style={{padding: '10px 15px', background: '#1f2937', color: '#9ca3af', fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '1px', borderBottom: '1px solid #374151'}}>
                               &gt;_ SECURE_LOGS.SH
                        </div>
                        <div className="terminal-content" style={{padding:12, maxHeight: 520, overflow:'auto'}}>
                            {logs.map((l, i) => (
                                <div key={i} style={{marginBottom: '6px', borderLeft: `2px solid ${l.type === 'error' ? '#ef4444' : l.type === 'success' ? '#10b981' : '#374151'}`, paddingLeft: '8px'}}>
                                    <span style={{color: '#6b7280', marginRight: '8px', fontSize: '0.75rem'}}>{l.time}</span>
                                    <span style={{color: l.type === 'error' ? '#ef4444' : l.type === 'warning' ? '#f59e0b' : l.type === 'success' ? '#10b981' : '#d1d5db'}}>{l.msg}</span>
                                </div>
                            ))}
                            <div ref={logsEndRef} />
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .btn-gen { background: #374151; border: 1px solid #4b5563; color: #e5e7eb; padding: 8px 10px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; }
                .btn-gen:hover { background: #4b5563; }
            `}</style>
        </div>
    );
}
