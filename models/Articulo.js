const mongoose = require('mongoose');

const articuloSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  extracto: { type: String, required: true }, 
  contenido: { type: String, required: true },
  categoria: { type: String, default: 'Entrenamiento' },
  imagen: { type: String },
  autor: { type: String, required: true }, 
  autorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  vistas: { type: Number, default: 0 },
  
  // Borramos 'estaActivo' y dejamos solo 'oculto'
  oculto: { type: Boolean, default: false },

  comentarios: [{
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    autor: String,
    texto: String,
    fecha: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Articulo', articuloSchema);