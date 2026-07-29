const mongoose = require('mongoose');

const RutinaSchema = new mongoose.Schema({
  titulo: {
    type: String,
    required: true,
    trim: true
  },
  descripcion: {
    type: String,
    required: true,
    trim: true
  },
  nivel: {
    type: String,
    required: true,
    enum: ['Principiante', 'Intermedio', 'Avanzado'],
    default: 'Principiante'
  },
  tiempo: {
    type: Number, // En minutos
    required: true
  },
  calorias: {
    type: Number, // En kcal
    required: true
  },
  videoUrl: {
    type: String,
    default: null 
  },
  videoId: {
      type: String,
      default: null
    },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  estaActiva: {
  type: Boolean,
  default: true
  },
  vistas: 
  { type: Number, default: 0 },
});

module.exports = mongoose.model('Rutina', RutinaSchema);