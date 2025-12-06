import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../home.css';

export default function Home() {
  // Configuration simulée (Paramètres standards CKKS)
  const [polyModulus, setPolyModulus] = useState("8192");
  const [scale, setScale] = useState("40");
  const [inputVal, setInputVal] = useState("10, 20, 5.5");
  
  const [step, setStep] = useState(0); 

  const nextStep = () => setStep(prev => Math.min(prev + 1, 5));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 0));
  const reset = () => setStep(0);

  const renderStepContent = () => {
    switch (step) {
     // ... dans renderStepContent ...

      case 1:
        return (
          <div className="step-content-active animate-enter">
            <div className="step-badge">Phase 1 : Initialisation</div>
            <h2>1. Choix des Paramètres (SEALContext)</h2>
            <p className="tech-desc">
              Avant de générer la moindre clé, la librairie doit construire le contexte mathématique.
            </p>
            <ul className="tech-list">
              {/* Ici, j'utilise déjà tes variables pour l'explication */}
              <li><strong>PolyModulusDegree (N={polyModulus}) :</strong> Fixe la sécurité...</li>
              <li><strong>Scale (2^{scale}) :</strong> La précision...</li>
            </ul>

            {/* --- C'EST ICI QUE TU DOIS CHANGER --- */}
            <div className="visual-box">
              ✅ Contexte Créé : <code>SEALContext(N={polyModulus}, Q=Default, Scale=2^{scale})</code>
            </div>
            {/* ------------------------------------- */}
            
          </div>
        );

// ... suite du code ...
      case 2:
        return (
          <div className="step-content-active animate-enter">
            <div className="step-badge">Phase 2 : Génération des Clés</div>
            <h2>2. KeyGenerator</h2>
            <p className="tech-desc">
              Maintenant que le contexte existe, nous créons les clés nécessaires.
            </p>
            <ul className="tech-list">
              <li><strong style={{color:'#ef4444'}}>Secret Key (sk) :</strong> La seule clé capable de déchiffrer. Elle ne quitte jamais ce navigateur.</li>
              <li><strong style={{color:'#10b981'}}>Public Key (pk) :</strong> Sert à chiffrer les données. Elle est publique.</li>
              <li><strong>RelinKeys :</strong> Clé spéciale pour ramener la taille du ciphertext de 3 à 2 après une multiplication.</li>
              <li><strong>GaloisKeys :</strong> Clé spéciale pour effectuer des rotations (décalages) sur les vecteurs chiffrés.</li>
            </ul>
            <div className="visual-box" style={{display:'flex', justifyContent:'space-around'}}>
               <span>🔑 sk: [HIDDEN]</span>
               <span>🌍 pk: 0x4A1...</span>
               <span>⚙️ rlk: 0xB92...</span>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="step-content-active animate-enter">
            <div className="step-badge">Phase 3 : Ingestion</div>
            <h2>3. Encodage & Chiffrement</h2>
            <p className="tech-desc">
              Traitement de votre vecteur <strong>[{inputVal}]</strong>.
            </p>
            <ul className="tech-list">
              <li><strong>CKKSEncoder :</strong> Transforme le vecteur en polynôme "Plaintext". <br/><code>Plain = Encode(vecteur, scale)</code></li>
              <li><strong>Encryptor :</strong> Ajoute le masque et le bruit. <br/><code>Cipher = Encrypt(Plain, pk)</code></li>
            </ul>
           <div className="visual-box">
  Input: <span style={{color:'#10b981'}}>[{inputVal}]</span> <br/>
  ⬇️ <br/>
  Ciphertext (Blob): <span style={{fontFamily:'monospace', color:'#fcd34d'}}>Base64String(size=~{(parseInt(polyModulus)/1024 * 3).toFixed(1)}KB)</span>
</div>
          </div>
        );
      case 4:
        return (
          <div className="step-content-active animate-enter">
            <div className="step-badge">Phase 4 : Cloud Computing</div>
            <h2>4. Calcul Homomorphe (Evaluator)</h2>
            <p className="tech-desc">
              Le serveur reçoit le Ciphertext et exécute des opérations aveugles.
            </p>
            <ul className="tech-list">
              <li><strong>Evaluator.Add :</strong> Additionne les polynômes. Le bruit s'additionne.</li>
              <li><strong>Evaluator.Multiply :</strong> Multiplie les polynômes. Le bruit explose.</li>
              <li><strong>Rescale :</strong> Maintenance critique. On divise par un module pour réduire le bruit et l'échelle.</li>
            </ul>
            <div className="visual-box">
              Opération : <code>Somme & Moyenne</code> <br/>
              État : Le serveur manipule des polynômes géants sans connaître x.
            </div>
          </div>
        );
      case 5:
        return (
          <div className="step-content-active animate-enter">
            <div className="step-badge">Phase 5 : Retour Client</div>
            <h2>5. Déchiffrement (Decryptor)</h2>
            <p className="tech-desc">
              Le résultat chiffré revient chez vous.
            </p>
            <ul className="tech-list">
              <li><strong>Decryptor :</strong> Utilise <code>sk</code> pour retirer le masque. On obtient un Plaintext bruité.</li>
              <li><strong>CKKSEncoder.Decode :</strong> Convertit le Plaintext en vecteur de réels.</li>
              <li><strong>Résultat :</strong> Valeur approchée (car le bruit n'est jamais totalement nul).</li>
            </ul>
            <div className="visual-box">
              <span style={{color:'#10b981'}}>Déchiffrement Réussi !</span> <br/>
              Les données sont de nouveau lisibles.
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="home-wrapper" style={{textAlign:'center', paddingTop:'3rem'}}>
      
      <h1 className="hero-title">Architecture <span style={{color:'#3b82f6'}}>CKKS</span></h1>
      
      {/* ÉCRAN DE SETUP (STEP 0) - "ASK FOR EVERYTHING" */}
      
      {step === 0 && (
        <div className="animate-enter" style={{maxWidth:'700px', margin:'0 auto'}}>
          <p className="hero-subtitle">
            Configuration d'un canal sécurisé Homomorphe. <br/>
            Veuillez définir les paramètres du moteur cryptographique et vos données.
          </p>
          
          <div style={{background:'#1e293b', padding:'2rem', borderRadius:'12px', border:'1px solid #334155', textAlign:'left'}}>
            
            {/* 1. Paramètres Techniques */}
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1.5rem'}}>
                <div>
                    <label style={{color:'#94a3b8', fontSize:'0.85rem', display:'block', marginBottom:'5px'}}>Degré Polynôme (N)</label>
                    <select 
                        value={polyModulus} onChange={e => setPolyModulus(e.target.value)}
                        style={{width:'100%', padding:'10px', background:'#0f172a', border:'1px solid #475569', color:'white', borderRadius:'6px'}}
                    >
                        <option value="4096">4096 (Rapide, Faible Sécurité)</option>
                        <option value="8192">8192 (Standard)</option>
                        <option value="16384">16384 (Haute Précision)</option>
                    </select>
                </div>
                <div>
                    <label style={{color:'#94a3b8', fontSize:'0.85rem', display:'block', marginBottom:'5px'}}>Échelle Précision (Bits)</label>
                    <select 
                        value={scale} onChange={e => setScale(e.target.value)}
                        style={{width:'100%', padding:'10px', background:'#0f172a', border:'1px solid #475569', color:'white', borderRadius:'6px'}}
                    >
                        <option value="30">30 bits (Approx)</option>
                        <option value="40">40 bits (Standard)</option>
                        <option value="60">60 bits (Haute Précision)</option>
                    </select>
                </div>
            </div>

            {/* 2. Données Utilisateur */}
            <div style={{marginBottom:'2rem'}}>
                <label style={{color:'#94a3b8', fontSize:'0.85rem', display:'block', marginBottom:'5px'}}>Données à Chiffrer (Vecteur)</label>
                <input 
                  value={inputVal} 
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="Ex: 10, 20, 30"
                  style={{
                    width:'100%', padding:'12px', fontSize:'1rem', borderRadius:'6px', 
                    border:'1px solid #475569', background:'#0f172a', color:'white', fontFamily:'monospace'
                  }}
                />
            </div>

            {/* BOUTON SETUP */}
            
            <button onClick={nextStep} className="btn-cta" style={{width:'100%', display:'flex', justifyContent:'center', alignItems:'center', gap:'10px'}}>
              <span></span> Initialiser Contexte & Générer Clés
            </button>
            <p style={{fontSize:'0.8rem', color:'#64748b', marginTop:'10px', textAlign:'center'}}>
                Cette action va générer les paires de clés (pk, sk) et préparer l'encodeur.
            </p>

          </div>

          <div style={{marginTop:'3rem'}}>
            <Link to="/demo" style={{color:'#64748b', textDecoration:'underline', fontSize:'0.9rem'}}>
                Accès direct Mode Expert (Démo Big Data)
            </Link>
          </div>
        </div>
      )}

      {/* ÉCRANS ÉTAPES (STEP 1-5) */}
      {step > 0 && (
        <div style={{maxWidth:'800px', margin:'0 auto'}}>
          
          {/* Progression */}
          <div style={{display:'flex', gap:'5px', marginBottom:'2rem', justifyContent:'center'}}>
            {[1,2,3,4,5].map(s => (
              <div key={s} style={{
                height:'4px', flex:1, borderRadius:'2px', 
                background: s <= step ? '#3b82f6' : '#334155',
                transition: 'all 0.3s'
              }}></div>
            ))}
          </div>

          {/* Contenu */}
          <div style={{minHeight:'350px', textAlign:'left'}}>
            {renderStepContent()}
          </div>

          {/* Nav */}
          <div style={{marginTop:'2rem', display:'flex', justifyContent:'space-between', borderTop:'1px solid #334155', paddingTop:'1rem'}}>
            <button onClick={prevStep} style={{
              background:'transparent', border:'none', color:'#94a3b8', cursor:'pointer', fontSize:'1rem'
            }}>
              &larr; Retour
            </button>

            {step < 5 ? (
              <button onClick={nextStep} className="btn-cta" style={{padding:'10px 30px'}}>
                Suivant &rarr;
              </button>
            ) : (
              <div style={{display:'flex', gap:'1rem'}}>
                 <button onClick={reset} style={{background:'#1e293b', color:'white', padding:'10px 20px', borderRadius:'6px', border:'1px solid #334155', cursor:'pointer'}}>
                    Nouveau Setup
                 </button>
                 <Link to="/demo">
                    <button className="btn-cta">
                        Lancer le Laboratoire (Démo) 🚀
                    </button>
                 </Link>
              </div>
            )}
          </div>

        </div>
      )}
      {/* ... dans la section Step 0 (Setup) ... */}

<div style={{marginTop:'3rem', display:'flex', flexDirection:'column', gap:'15px'}}>
  
 
  
  <Link to="/tools" style={{color:'#94a3b8', fontSize:'0.9rem', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'}}>
     <span>🛠️</span> Voir les Outils Techniques & Optimiseurs
  </Link>

</div>
    </div>
  );
  
}