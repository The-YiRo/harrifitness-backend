const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User'); 
const auth = require('../middleware/auth'); 
const transporter = require('../utils/mailer');

// ==========================================
// 1. RUTAS ESTÁTICAS (DEBEN IR PRIMERO PARA QUE EXPRESS NO SE CONFUNDA)
// ==========================================

// POST: Generar y solicitar un código de verificación por correo
router.post('/solicitar-codigo', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    const codigoOtp = Math.floor(100000 + Math.random() * 900000).toString();
    user.codigoVerificacion = codigoOtp;
    await user.save();

    const mailOptions = {
      from: `"HarriFitness App" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Código de Seguridad - HarriFitness',
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
          <h2 style="color: #2ECC71;">Verificación de Seguridad</h2>
          <p>Hola <strong>${user.name}</strong>, has solicitado realizar un cambio en tu cuenta.</p>
          <p>Tu código de seguridad de 6 dígitos es:</p>
          <h1 style="background-color: #f4f4f4; padding: 15px; letter-spacing: 5px; color: #333; border-radius: 10px; display: inline-block;">
            ${codigoOtp}
          </h1>
          <p style="color: #777; font-size: 12px; margin-top: 20px;">Si no fuiste tú, ignora este mensaje y cambia tu contraseña.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✉️ Correo enviado exitosamente a ${user.email}`);

    res.status(200).json({ mensaje: 'Código enviado exitosamente al correo.' });
  } catch (error) {
    console.error("Error al generar/enviar código:", error);
    res.status(500).json({ mensaje: 'Error al procesar la solicitud de seguridad.' });
  }
});

// PUT: Actualizar Datos Sensibles (Nombre, Correo, Teléfono - EXIGE OTP)
router.put('/datos', auth, async (req, res) => {
  try {
    const { name, email, telefono, codigoOtp } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

    if (!codigoOtp || (codigoOtp !== user.codigoVerificacion)) {
      return res.status(400).json({ mensaje: 'Código de seguridad incorrecto o vencido.' });
    }

    if (email) {
      let emailExistente = await User.findOne({ email });
      if (emailExistente && emailExistente._id.toString() !== req.user.id) {
        return res.status(400).json({ mensaje: 'El correo ya está en uso por otra cuenta.' });
      }
      user.email = email;
    }

    if (name) user.name = name;
    if (telefono) user.telefono = telefono;

    user.codigoVerificacion = null; // Borramos el código por seguridad
    await user.save();

    res.status(200).json({ mensaje: 'Datos actualizados correctamente', user });

  } catch (error) {
    console.error("Error al actualizar datos:", error);
    res.status(500).json({ mensaje: 'Error en el servidor.' });
  }
});

// PUT: Cambiar Contraseña Sensible (EXIGE CONTRASEÑA ACTUAL Y OTP)
router.put('/password', auth, async (req, res) => {
  try {
    const { passwordActual, passwordNueva, codigoOtp } = req.body;

    let user = await User.findById(req.user.id);

    if (!codigoOtp || (codigoOtp !== user.codigoVerificacion)) {
      return res.status(400).json({ mensaje: 'Código de seguridad incorrecto o vencido.' });
    }

    const isMatch = await bcrypt.compare(passwordActual, user.password);
    if (!isMatch) {
      return res.status(400).json({ mensaje: 'La contraseña actual es incorrecta.' });
    }

    user.password = passwordNueva;
    user.codigoVerificacion = null;
    await user.save();

    res.status(200).json({ mensaje: '¡Contraseña actualizada exitosamente!' });

  } catch (error) {
    console.error("Error al cambiar contraseña:", error);
    res.status(500).json({ mensaje: 'Error en el servidor.' });
  }
});

// ==========================================
// 2. RUTAS DINÁMICAS
// ==========================================

// GET: Enviar los datos del usuario a la app (SIN AUTH para que la app lo lea sin problemas)
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    // 🚀 MAGIA PARA LAS GRÁFICAS: Convertimos el documento a un objeto manipulable
    const perfilUsuario = user.toObject();

    // Si el usuario es nuevo y no tiene estadísticas, se las enviamos en 0
    if (!perfilUsuario.estadisticas) {
      perfilUsuario.estadisticas = {
        peso: 0,
        altura: 0,
        caloriasQuemadas: 0,
        tiempoEntrenado: 0,
        rutinasCompletadas: 0
      };
    } else {
      // Si ya tiene el objeto, pero le falta algún campo específico, lo forzamos a 0
      perfilUsuario.estadisticas.peso = perfilUsuario.estadisticas.peso || 0;
      perfilUsuario.estadisticas.altura = perfilUsuario.estadisticas.altura || 0;
      perfilUsuario.estadisticas.caloriasQuemadas = perfilUsuario.estadisticas.caloriasQuemadas || 0;
      perfilUsuario.estadisticas.tiempoEntrenado = perfilUsuario.estadisticas.tiempoEntrenado || 0;
      perfilUsuario.estadisticas.rutinasCompletadas = perfilUsuario.estadisticas.rutinasCompletadas || 0;
    }

    // Enviamos el perfil ya formateado y seguro para las gráficas
    res.status(200).json(perfilUsuario);
  } catch (error) {
    console.error("Error al obtener el perfil:", error);
    res.status(500).json({ mensaje: 'Error al obtener el perfil' });
  }
});

// PUT: Guardar cambios del Perfil Rápido (Peso y Altura - CON AUTH pero sin tocar Roles)
router.put('/:id', auth, async (req, res) => {
  try {
    // 🔥 Quitamos "role" de aquí. Los roles solo se cambian desde el AdminDashboard
    const { name, peso, altura } = req.body; 
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    // Validación de seguridad extra: el usuario solo puede editar su propio perfil
    if (user._id.toString() !== req.user.id) {
      return res.status(403).json({ mensaje: 'No tienes permisos para editar este perfil' });
    }

    if (name) user.name = name;
    
    if (!user.estadisticas) user.estadisticas = {};
    if (peso) user.estadisticas.peso = peso;
    if (altura) user.estadisticas.altura = altura;

    await user.save();
    
    res.status(200).json({ mensaje: 'Perfil actualizado exitosamente', user });
  } catch (error) {
    console.error("Error al actualizar el perfil:", error);
    res.status(500).json({ mensaje: 'Error al actualizar el perfil' });
  }
});

// Guardar el progreso al terminar un video (CON AUTH)
router.post('/:userId/progreso', auth, async (req, res) => {
  console.log(`📥 Guardando progreso para el usuario: ${req.params.userId}`);
  
  try {
    const { userId } = req.params;
    const { calorias, tiempo } = req.body;
    const Notificacion = require('../models/Notificacion'); 

    if (userId !== req.user.id) {
      return res.status(403).json({ mensaje: 'Acción no permitida' });
    }

    const usuario = await User.findById(userId);
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

    if (!usuario.estadisticas) {
      usuario.estadisticas = {};
    }

    // Sumamos directamente usando JavaScript asegurando que sean números puros
    usuario.estadisticas.caloriasQuemadas = (Number(usuario.estadisticas.caloriasQuemadas) || 0) + (Number(calorias) || 0);
    usuario.estadisticas.tiempoEntrenado = (Number(usuario.estadisticas.tiempoEntrenado) || 0) + (Number(tiempo) || 0);
    usuario.estadisticas.rutinasCompletadas = (Number(usuario.estadisticas.rutinasCompletadas) || 0) + 1;
    usuario.estadisticas.racha = (Number(usuario.estadisticas.racha) || 0) + 1;

    await usuario.save(); // Guarda limpiecito y sin conflictos de tipos de MongoDB

    const rutinasTotales = usuario.estadisticas.rutinasCompletadas;
    const metas = [1, 5, 10, 20, 50, 100]; 

    if (metas.includes(rutinasTotales)) {
      let tituloMensaje = '¡Nuevo Hito Alcanzado! 🔥';
      let cuerpoMensaje = `¡Increíble! Acabas de completar tu rutina número ${rutinasTotales}. ¡No te rindas!`;

      if (rutinasTotales === 1) {
        tituloMensaje = '¡Primera Rutina! 🏆';
        cuerpoMensaje = 'Has dado el primer paso hacia tu mejor versión completando tu primera rutina.';
      }

      await Notificacion.create({
        usuarioId: userId,
        tipo: 'racha',
        titulo: tituloMensaje,
        mensaje: cuerpoMensaje
      });
    }

    res.status(200).json({ 
      mensaje: '¡Progreso registrado con éxito!', 
      estadisticas: usuario.estadisticas 
    });

  } catch (error) {
    console.error("❌ Error guardando progreso:", error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

// Alternar Favoritas (CON AUTH)
router.post('/:userId/favoritas', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { rutinaId } = req.body;

    if (userId !== req.user.id) {
      return res.status(403).json({ mensaje: 'Acción no permitida' });
    }

    const usuario = await User.findById(userId);
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

    const yaEsFavorita = usuario.rutinasFavoritas.includes(rutinaId);

    if (yaEsFavorita) {
      await User.findByIdAndUpdate(userId, { $pull: { rutinasFavoritas: rutinaId } });
      res.status(200).json({ mensaje: 'Rutina eliminada de favoritas', agregada: false });
    } else {
      await User.findByIdAndUpdate(userId, { $addToSet: { rutinasFavoritas: rutinaId } });
      res.status(200).json({ mensaje: 'Rutina agregada a favoritas', agregada: true });
    }
  } catch (error) {
    console.error("❌ Error con favoritas:", error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

module.exports = router;