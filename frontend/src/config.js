// frontend/src/config.js

// Si VITE_API_URL est défini (sur Azure), on l'utilise.
// Sinon, on reste sur localhost:4000 pour le dév local.
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export const ENDPOINTS = {
    SIMULATE_NOISE: `${API_BASE_URL}/api/simulate-noise`,
    OPTIMIZER: `${API_BASE_URL}/api/simulate-optimizer`,
    UPLOAD_CHUNK: `${API_BASE_URL}/api/upload-chunk`,
    COMPUTE_STATS: `${API_BASE_URL}/api/compute-stats`,
    RESET: `${API_BASE_URL}/api/reset`,
};

export default API_BASE_URL;