const mongoose = require('mongoose');

const BaneoSchema = new mongoose.Schema({
  usuario: { type: String, required: true },
  motivo: { type: String, required: true },
  fechaRaw: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Baneo', BaneoSchema);