import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
// Import des fonctions de chiffrement par lot, y compris getBatchSize
import { initSEALAndKeys, encryptBatch, decryptResult, getBatchSize } from '../he_client'; 
import { ENDPOINTS } from '../config'; 

// --- DÉFINITION DU COMPOSANT OPTIMISÉ ---
export default function Demo() {
    const [logs, setLogs] = useState([]);
    const [status, setStatus] = useState("Initialisation...");
    
    // Données : Utiliser un tableau de nombres (Float64Array) pour l'efficacité mémoire
    const [inputData, setInputData] = useState(null); 
    const [fileInfo, setFileInfo] = useState(null);  
    
    // Previews & chiffrement local
    const [plaintextPreview, setPlaintextPreview] = useState([]);
    const [encryptedChunks, setEncryptedChunks] = useState([]); // { index, ciphertext }
    const [showEncryptedPreview, setShowEncryptedPreview] = useState(false);

    // Résultats
    const [resultMean, setResultMean] = useState(null);
    const [resultSum, setResultSum] = useState(null);

    const [isProcessing, setIsProcessing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false); 
    const [activeStep, setActiveStep] = useState(0); 
    const logsEndRef = useRef(null);

    // Initialisation SEAL (inchangée)
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

    // --- FONCTION GÉNÉRATION BIG DATA (Optimisée) ---
    const generateBigData = (count) => {
        setIsGenerating(true);
        addLog(`Génération de ${count.toLocaleString()} lignes... (Patientez)`, "warning");

        setTimeout(() => {
            try {
                // Utilisation de Float64Array pour la performance
                const data = new Float64Array(count);
                for(let i=0; i<count; i++) data[i] = Number((Math.random() * 1000).toFixed(2)); // <-- Number() pour éviter string
                
                setInputData(data); // Stocke le tableau binaire
                setFileInfo({ 
                    name: `generated_bigdata_${count/1000}k`, 
                    size: "RAM", 
                    count: count 
                });

                // Preview des premières valeurs
                setPlaintextPreview(Array.from(data.slice(0, 20)));
                setEncryptedChunks([]);
                setShowEncryptedPreview(false);

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

    // --- Gestion Fichier Upload Classique (Adaptée au Float64Array) ---
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if(!file) return;

        setResultMean(null);
        setResultSum(null);
        setActiveStep(1);
        setEncryptedChunks([]);
        setShowEncryptedPreview(false);

        addLog(`Analyse : ${file.name}...`, "warning");
        
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const content = evt.target.result;
                // Parse la donnée en tableau de nombres
                const numsArray = content.split(/[\n,]+/).map(line => parseFloat(line.trim())).filter(n => !isNaN(n));

                if (numsArray.length === 0) throw new Error("Aucune donnée valide.");

                const farr = new Float64Array(numsArray);
                setInputData(farr); // Stocke en Float64Array
                setFileInfo({ name: file.name, size: (file.size/1024).toFixed(2) + " KB", count: numsArray.length });
                setPlaintextPreview(Array.from(farr.slice(0, 20)));
                addLog(`Succès. ${numsArray.length} entrées chargées.`, "success");
            } catch(err) {
                addLog(`Erreur lecture: ${err.message}`, "error");
            }
        };
        reader.readAsText(file);
    };

    // --- Helpers de téléchargement (Avant / Après) ---
    const downloadPlaintext = () => {
        if(!inputData) return;
        const csv = Array.from(inputData).join('\n');
        const blob = new Blob([csv], {type: 'text/csv'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (fileInfo?.name || 'data') + '.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const downloadEncrypted = () => {
        if(encryptedChunks.length === 0) return;
        const payload = { meta: { originalName: fileInfo?.name || null, count: inputData?.length || 0 }, chunks: encryptedChunks };
        const blob = new Blob([JSON.stringify(payload)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (fileInfo?.name || 'data') + '.encrypted.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    // --- Processus Global (Optimisé pour la Cloud) ---
    const startProcess = async () => {
        if(!inputData) return;
        setIsProcessing(true);
        setResultMean(null);
        setResultSum(null);
        setActiveStep(1);
        setEncryptedChunks([]);
        setShowEncryptedPreview(false);

        try {
            const dataToProcess = inputData;
            addLog(`Lancement du calcul complet sur ${dataToProcess.length.toLocaleString()} valeurs.`, "info");

            // A. CHIFFREMENT PAR LOTS (Code 1: Efficacité maximale)
            addLog("🔒 Chiffrement par lots (Client Side)...", "warning");
            const BATCH_SIZE = getBatchSize(); 
            const localEncrypted = [];

            for(let i=0; i < dataToProcess.length; i += BATCH_SIZE) {
                // Utilise le sous-tableau pour l'encodage
                const chunk = dataToProcess.subarray(i, i + BATCH_SIZE);
                // NOTE: encryptBatch peut être asynchrone ; on await pour être sûr
                const b64 = await encryptBatch(chunk);
                localEncrypted.push({ index: localEncrypted.length, ciphertext: b64 });
                // garder un aperçu du premier chunk chiffré
                if (localEncrypted.length === 1) setEncryptedChunks([localEncrypted[0]]);
            }
            setEncryptedChunks(localEncrypted);
            addLog(`Chiffrement terminé. ${localEncrypted.length} paquets chiffrés générés.`, "success");

            // B. UPLOAD OPTIMISÉ (Utilise Axios avec parallèle)
            setActiveStep(2);
            addLog("☁️ Envoi au Cloud Sécurisé (par lots)...", "warning");
            
            // 1. Reset Server (Axios)
            await axios.post(ENDPOINTS.RESET);
            
            // 2. Upload par lots de 5 requêtes simultanées
            const UPLOAD_BATCH_SIZE = 5; 
            for (let i = 0; i < localEncrypted.length; i += UPLOAD_BATCH_SIZE) {
                const batch = localEncrypted.slice(i, i + UPLOAD_BATCH_SIZE);
                // Utilise Promise.all pour l'envoi parallèle
                await Promise.all(
                    batch.map(c => axios.post(ENDPOINTS.UPLOAD_CHUNK, c))
                );
            }
            addLog(`Données envoyées au cloud.`, "success");

            // C. COMPUTE (Axios)
            addLog(`Demande de calculs statistiques...`, "warning");
            const res = await axios.post(ENDPOINTS.COMPUTE_STATS);
            const data = res.data; 
            
            if(data.error) throw new Error(data.error);
            addLog("Succès. Résultats chiffrés reçus.", "success");

            // D. DECRYPT & AGGREGATION (Code 1: Déchiffrement vectoriel)
            setActiveStep(3);
            addLog("🔓 Déchiffrement des résultats...", "warning");
            
            const decodedSumVector = await decryptResult(data.sumCiphertext);
            const decodedMeanVector = await decryptResult(data.meanCiphertext);

            // Normaliser : decryptResult peut retourner un array ou un nombre
            const normDecodedSum = Array.isArray(decodedSumVector) ? decodedSumVector : [decodedSumVector];
            const normDecodedMean = Array.isArray(decodedMeanVector) ? decodedMeanVector : [decodedMeanVector];

            // Sommation des slots du vecteur pour le résultat final (requis par CKKS)
            const totalSum = normDecodedSum.reduce((a, b) => a + b, 0);
            const finalMean = normDecodedMean.reduce((a, b) => a + b, 0); // La moyenne peut être répliquée dans le vecteur par le serveur.

            setResultSum(totalSum.toLocaleString(undefined, { maximumFractionDigits: 2 }));
            setResultMean(finalMean.toLocaleString(undefined, { maximumFractionDigits: 4 }));

            addLog(`Terminé ! Données révélées.`, "success");
            setShowEncryptedPreview(true);

        } catch(e) {
            console.error(e);
            addLog("Erreur de connexion ou de calcul: " + (e.message || e), "error");
        }
        setIsProcessing(false);
    };

    // Le return (IHM) reste identique au Code 2 pour la richesse visuelle.
    return (
        // ... (Le JSX complet de la version 2 pour l'IHM riche) ...
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

                            <div style={{display:'flex', gap:8, marginTop:12}}>
                                <button 
                                    onClick={startProcess} 
                                    disabled={isProcessing || !inputData || isGenerating}
                                    style={{
                                        background: isProcessing ? '#1f2937' : '#3b82f6', 
                                        color: 'white', padding: '12px', borderRadius: '6px', border: 'none',
                                        cursor: (isProcessing || !inputData) ? 'default' : 'pointer', fontWeight: 'bold'
                                    }}
                                >
                                    {isProcessing ? "Traitement en cours..." : isGenerating ? "Génération..." : "Lancer le Calcul Sécurisé 🚀"}
                                </button>

                                <button onClick={downloadPlaintext} disabled={!inputData} style={{padding:'12px', borderRadius:6}}>
                                    Télécharger - Avant (CSV)
                                </button>

                                <button onClick={downloadEncrypted} disabled={encryptedChunks.length===0} style={{padding:'12px', borderRadius:6}}>
                                    Télécharger - Chiffré (JSON)
                                </button>
                            </div>
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

                    {/* Aperçus */}
                    <div style={{marginTop:16}}>
                        <h4>Aperçu (Avant chiffrement)</h4>
                        <pre style={{maxHeight:120, overflow:'auto', background:'#0f172a', color:'#e5e7eb', padding:10}}>
                            {plaintextPreview.length ? plaintextPreview.join(', ') : '— aucune preview —'}
                        </pre>

                        <h4 style={{marginTop:12}}>Aperçu (Chiffré)</h4>
                        {encryptedChunks.length === 0 ? (
                            <div style={{color:'#94a3b8'}}>Aucun chunk chiffré encore.</div>
                        ) : (
                            <>
                                <div style={{color:'#94a3b8'}}>Chunks totaux: {encryptedChunks.length}</div>
                                <button onClick={() => setShowEncryptedPreview(s => !s)} style={{marginTop:8}}>
                                    {showEncryptedPreview ? 'Masquer preview chiffré' : 'Afficher preview chiffré (1er chunk)'}
                                </button>
                                {showEncryptedPreview && encryptedChunks[0] && (
                                    <pre style={{maxHeight:200, overflow:'auto', background:'#0f172a', color:'#e5e7eb', padding:10}}>
                                        {typeof encryptedChunks[0].ciphertext === 'string' ? encryptedChunks[0].ciphertext : JSON.stringify(encryptedChunks[0].ciphertext, null, 2)}
                                    </pre>
                                )}
                            </>
                        )}
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
