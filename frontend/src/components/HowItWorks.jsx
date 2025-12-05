import React from 'react';

const steps = [
  { id: 0, label: 'Raw Data', icon: '📄' },
  { id: 1, label: 'Encrypt', icon: '🔒' },
  { id: 2, label: 'Cloud Compute', icon: '☁️' },
  { id: 3, label: 'Decrypt', icon: '🔓' },
  { id: 4, label: 'Result', icon: '📊' }
];

export default function HowItWorks({ currentStep }) {
  return (
    <div className="card" style={{ marginTop: '2rem' }}>
      <h2>🔎 How Homomorphic Encryption Works</h2>
      <p style={{color: '#94a3b8', marginBottom: '2rem'}}>
        Standard encryption protects data only during transit. 
        Homomorphic encryption allows the cloud to <strong>process data while it remains encrypted</strong>.
      </p>
      
      <div className="steps-container">
        <div className="step-line"></div>
        {steps.map((step) => (
          <div 
            key={step.id} 
            className={`step ${currentStep >= step.id ? 'active' : ''}`}
          >
            <div className="step-icon">{step.icon}</div>
            <small>{step.label}</small>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
        <strong style={{ color: '#3b82f6' }}>Status: </strong>
        {currentStep === 0 && "Waiting for your input numbers..."}
        {currentStep === 1 && "Encoding numbers into polynomials & adding noise..."}
        {currentStep === 2 && "Sending encrypted blobs to server. Server is adding them BLINDLY."}
        {currentStep === 3 && "Received encrypted sum. Using Secret Key to remove noise..."}
        {currentStep === 4 && "Success! The exact average is revealed."}
      </div>
    </div>
  );
}