const mongoose = require('mongoose');

const reporteSchema = new mongoose.Schema({
  usuarioReportado: { type: String, required: true }, // Nombre o ID del usuario infractor
  usuarioQueReporta: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contenidoId: { type: mongoose.Schema.Types.ObjectId }, // ID de la rutina, artículo o comentario denunciado
  tipoContenido: { 
    type: String, 
    enum: ['articulo', 'rutina', 'comentario'], 
    required: true 
  },
  motivo: { type: String, required: true }, // Ej: 'Spam', 'Insultos', 'Acoso'
  comentario: { type: String, required: true }, // El texto ofensivo o la queja
  estado: { 
    type: String, 
    enum: ['pendiente', 'resuelto', 'ignorado'], 
    default: 'pendiente' 
  },
  fechaRaw: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Reporte', reporteSchema);