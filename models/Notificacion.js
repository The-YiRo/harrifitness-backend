const mongoose = require('mongoose');

const notificacionSchema = new mongoose.Schema({
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // Si es null, es para TODOS los usuarios (global)
  tipo: { type: String, enum: ['racha', 'video', 'blog', 'evento'], required: true },
  titulo: { type: String, required: true },
  mensaje: { type: String, required: true },
  leidaPor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Quienes ya la leyeron
}, { timestamps: true });

module.exports = mongoose.model('Notificacion', notificacionSchema);