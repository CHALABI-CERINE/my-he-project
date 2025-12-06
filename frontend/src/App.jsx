import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Import des Pages
import Home from './pages/Home';
import Demo from './pages/Demo';
import Tools from './pages/Tools';
import Optimizer from './pages/Optimizer';
import DataGenerator from './pages/DataGenerator';
import PrecisionLab from './pages/PrecisionLab';
// ...


export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
  
      <Routes>
        {/* Page d'Accueil (Wizard Pédagogique) */}
        <Route path="/" element={<Home />} />
        
        {/* Démo Principale (Big Data) */}
        <Route path="/demo" element={<Demo />} />
        
        {/* Hub des Outils */}
        <Route path="/tools" element={<Tools />} />
        
        {/* Outil Spécifique : Optimiseur */}
        <Route path="/optimizer" element={<Optimizer />} />
        <Route path="/generator" element={<DataGenerator />} />
        <Route path="/precision-lab" element={<PrecisionLab />} />
      </Routes>
      

    </BrowserRouter>
  );
}