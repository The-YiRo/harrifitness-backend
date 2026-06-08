// usuarios.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'trainer', 'moderator', 'admin', 'editor'],
    default: 'user'
  }
}, {
  timestamps: true // Esto crea automáticamente los campos createdAt y updatedAt (CreacionAt y ActualizacionAt)
});

// Middleware que se ejecuta antes de guardar un nuevo usuario o cambiar la clave
userSchema.pre('save', async function (next) {
    if(!this.isModified('password')){
        return;
    }

// Se va a generar un "salt" (va a ser una cadena de seguridad) de encriptacion

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);

})

const User = mongoose.model('User', userSchema);

module.exports = User;