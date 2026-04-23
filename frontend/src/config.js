// frontend/src/config.js
// Single place for backend URLs.
//
// Dev  (npm run dev):  uses localhost:5001 directly
// Prod (Docker/EC2):   uses relative /api/v1 — Nginx proxies to backend container
//
// Values come from .env.development or .env.production (Vite loads at build time)

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1'
export const SERVER_URL   = import.meta.env.VITE_SERVER_URL   || 'http://localhost:5001'
