const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  telefono: { type: String, required: true, trim: true },
  password: { type: String, required: true },
  roles: { 
    type: [String], 
    enum: ['user', 'trainer', 'moderator', 'admin', 'editor'], 
    default: ['user'] 
  },
  estadisticas: {
  caloriasQuemadas: { type: Number, default: 0 },
  tiempoEntrenado: { type: Number, default: 0 },
  rutinasCompletadas: { type: Number, default: 0 },
  peso: { type: Number, default: 0 },
  altura: { type: Number, default: 0 },
  racha: { type: Number, default: 0 }
  },
  baneado: {
    type: Boolean,
    default: false,
  },
  rutinasFavoritas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Rutina' }],
  
  // ¡ESTE ES EL CAMPO PARA LAS RACHAS! 
  ultimoEntrenamiento: { type: Date },

  // CAMPOS PARA LA VERIFICACIÓN DE CORREO 
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  
  //Campo de notificaciones
  expoPushToken: {
      type: String,
      default: ""
    },

  // 🔥 NUEVO CAMPO: PARA EL CÓDIGO OTP DE SEGURIDAD (Cambio de nombre/correo/teléfono/password)
  codigoVerificacion: { type: String, default: null }

}, { timestamps: true });

// Middleware que se ejecuta antes de guardar un nuevo usuario
userSchema.pre('save', async function () {
  // Si la contraseña no se modificó, simplemente retornamos y Mongoose guarda
  if (!this.isModified('password')) {
    return; 
  }

  // Generamos el "salt" y encriptamos la contraseña directamente
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});


const User = mongoose.model('User', userSchema);
module.exports = User;