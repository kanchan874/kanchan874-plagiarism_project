import axios from 'axios';

// Use env variable if set, otherwise fall back to the deployed backend URL
// import.meta.env.PROD is true when built for production (Vite sets this automatically)
const BASE_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? 'https://backend-mocha-five-90.vercel.app' : '');

const api = axios.create({
  baseURL: BASE_URL,
});

export default api;
