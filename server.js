const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db')

dotenv.config();

connectDB();

const app = express();

// Middlewares globales (para aceptar peticiones del frontend)
app.use(cors());
app.use(express.json());

//ruta de autenticacion
app.use('/api/auth', require('./routes/auth'));

// Nuestra primera ruta de prueba
app.get('/', (req, res) => {
  res.send('¡Corriendo el Servidor de la APP HarriFitness! ');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});