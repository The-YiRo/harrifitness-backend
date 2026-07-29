const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/harrifitness");
    console.log("¡Conexión exitosa a MongoDB Local!");
  } catch (error) {
    console.error("Error de conexión:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;