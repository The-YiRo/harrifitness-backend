const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Intentamos conectar usando la variable de entorno
    await mongoose.connect(process.env.MONGO_URI);
    console.log('La conexion ha sido exitosa en la base de datos MongoDB');
  } catch (error) {
    console.error('Error de conexión:', error.message);
    process.exit(1); // Detiene el servidor si falla la conexión
  }
};

module.exports = connectDB;