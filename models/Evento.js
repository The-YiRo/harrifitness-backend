const mongoose = require('mongoose');

const eventoSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  fecha: { type: Date, required: true },
  ubicacion: { type: String, required: true },
  descripcion: { type: String, required: true },
  imagen: { type: String }, 
  asistentes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], 
  estaActivo: { type: Boolean, default: true }
}, { timestamps: true });

// ESTA LÍNEA ES LA CLAVE PARA QUE NO DÉ ERROR "NOT A FUNCTION"
module.exports = mongoose.model('Evento', eventoSchema);