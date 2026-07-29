const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();

connectDB();

const app = express();

// Middlewares globales (para aceptar peticiones del frontend)
app.use(cors());
app.use(express.json());

// --- RUTAS PRINCIPALES DEL SISTEMA ---
app.use('/api/chat', require('./routes/chat'));
app.use('/api/perfil', require('./routes/perfil'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/notificaciones', require('./routes/notificaciones'));
app.use('/api/blog', require('./routes/blog'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/rutinas', require('./routes/rutinas'));
app.use('/api/reportes', require('./routes/reportes'));

// Ruta de agendas
app.use('/api/agenda', require('./routes/agenda'));

// Ruta base para confirmar que está vivo
app.get('/', (req, res) => {
  res.send('¡Corriendo el Servidor de la APP HarriFitness! 🚀');
});

// --- ENRUTAMIENTO SEGURO DE PUERTOS ---
// Toma el puerto exacto que le pidas desde el archivo .env, si no, usa el 5000 por defecto.
const puertosPermitidos = [5000, 8080, 8000, 8088, 4200, 3000];

// '0.0.0.0' garantiza que si la petición entra por el Wi-Fi en este puerto, 
// se asigne de forma estricta y segura a esta aplicación.
puertosPermitidos.forEach((puerto) => {
  // Levantamos una "oreja" del servidor para cada puerto del arreglo
  const server = app.listen(puerto, '0.0.0.0', () => {
    console.log(`✅ Enrutamiento automático activo: Escuchando tráfico en el puerto ${puerto}`);
  });

  // Si un puerto ya está siendo usado por otro programa, evitamos que el servidor explote
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️  Aviso: El puerto ${puerto} está ocupado por otra app. HarriFitness seguirá operando en los demás puertos.`);
    } else {
      console.error(`❌ Error inesperado en el puerto ${puerto}:`, err);
    }
  });
});