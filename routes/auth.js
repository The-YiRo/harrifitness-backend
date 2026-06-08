const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Ruta: POST API/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ mensaje: 'Este correo ya está en uso.' });
    }

    user = new User({ name, email, password });
    await user.save();

    res.status(201).json({ mensaje: '¡Usuario registrado exitosamente!' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Hubo un error en el servidor.' });
  }
});

// Ruta: POST API/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Buscamos al usuario por su correo
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ mensaje: 'Correo o contraseña incorrectos.' });
    }

    // Comparamos la contraseña ingresada con la contraseña encriptada en la base de datos
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ mensaje: 'Correo o contraseña incorrectos.' });
    }

   //creacion del contenido del token (Payload)
   const payload={
    user:{
        id: user._id,
        role: user.role
    }
   };

   //Confirmacion del token y envio al FrontEnd

   jwt.sign(
    payload,
    process.env.JWT_SECRET,
    {expiresIn: '30d'}, //Duracion del token(Dura 30 dias activos)
    (error, token) =>{
        if(error) throw error;

        res.status(200).json({
            mensaje: 'Inicio de sesión exitoso',
          token: token, // ¡Aquí enviamos el token!
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
            }
        });
    }
   )

  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Hubo un error en el servidor!.' });
  }
});


module.exports = router;