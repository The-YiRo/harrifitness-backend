const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const transporter = require('../utils/mailer');
const auth = require('../middleware/auth');
const Reporte = require('../models/Reporte');
const Articulo = require('../models/Articulo');
const Baneo = require('../models/Baneo');

const CORREOS_MAESTROS = [
  "leandrogalavis2021@gmail.com", 
  "kinggtx777@gmail.com"
];

// 1. Registro de Usuario
router.post('/register', async (req, res) => {
  console.log("=== NUEVO INTENTO DE REGISTRO ===");
  console.log("Datos recibidos:", req.body); 

  try {
    const { name, email, telefono, password } = req.body;
    const emailSeguro = email.toLowerCase().trim();

    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 8 caracteres, incluir una letra y un número.' });
    }

    let user = await User.findOne({ email: emailSeguro });
    if (user) {
      return res.status(400).json({ mensaje: 'Este correo ya está en uso.' });
    }

    // Comprobamos si el correo pertenece a los desarrolladores
    const esDesarrollador = CORREOS_MAESTROS.includes(emailSeguro);

    // Generar código de 6 dígitos al azar (solo para usuarios normales)
    const codigoVerificacion = Math.floor(100000 + Math.random() * 900000).toString();

    // Crear el usuario
    user = new User({ 
      name, 
      email: emailSeguro, 
      telefono, 
      password,
      // Si es desarrollador, no necesita token, se verifica de una vez y es admin
      verificationToken: esDesarrollador ? undefined : codigoVerificacion,
      isVerified: esDesarrollador ? true : false,
      roles: esDesarrollador ? ["admin"] : ["user"] 
    });

    await user.save();

    // Acceso de admin (Leandro y Angel)
    if (esDesarrollador) {
      console.log(`¡Pase VIP! Administrador registrado y auto-verificado: ${emailSeguro}`);
      return res.status(201).json({ 
        mensaje: '¡Cuenta de Administrador creada y auto-verificada!' 
      });
    }

    await transporter.sendMail({
      from: '"HarriFitness App" <tu_correo@gmail.com>',
      to: user.email,
      subject: 'Tu código de verificación de HarriFitness',
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
          <h2>¡Bienvenido a HarriFitness, ${name}!</h2>
          <p>Tu código de verificación de 6 dígitos es:</p>
          <h1 style="background: #f4f4f4; padding: 10px; letter-spacing: 5px; color: #333;">${codigoVerificacion}</h1>
          <p>Ingrésalo en la aplicación para activar tu cuenta.</p>
        </div>
      `
    });

    console.log("¡ÉXITO! Usuario normal guardado y código enviado.");
    res.status(201).json({ mensaje: '¡Código enviado al correo!' });

  } catch (error) {
    console.error("=== ERROR CRÍTICO AL GUARDAR ===", error.message); 
    res.status(500).json({ mensaje: 'Hubo un error en el servidor.' });
  }
});

// 2. Verificacion de codigo que se envia al correo
router.post('/verify-code', async (req, res) => {
  try {
    // Aceptamos el codgio para recuperar contraseña)
    const email = req.body.email;
    const codigoIngresado = req.body.code || req.body.codigo; 
    const emailSeguro = email.toLowerCase().trim();

    const user = await User.findOne({ email: emailSeguro });

    if (!user) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    if (user.verificationToken !== codigoIngresado) {
      return res.status(400).json({ mensaje: 'El código es incorrecto.' });
    }

    // Activamos la cuenta y borramos el token por seguridad
    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.status(200).json({ mensaje: 'Cuenta verificada correctamente.' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al verificar la cuenta' });
  }
});

// 3. Login (Verifica las credenciales, verificación y con el estado de baneo)
router.post('/login', async (req, res) => {
  console.log("=== NUEVO INTENTO DE LOGIN ===");
  
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ mensaje: 'Por favor, envía el correo y la contraseña.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      return res.status(400).json({ mensaje: 'Correo o contraseña incorrectos.' });
    }

    // Bloqueo de login para usuarios baneados
    if (user.baneado) {
      console.log(`Intento de login bloqueado para usuario baneado: ${email}`);
      return res.status(403).json({ 
        mensaje: 'Tu cuenta ha sido suspendida permanentemente por violar las normas de la comunidad de HarriFitness.' 
      });
    }

    // Validar si el correo ya fue verificado
    if (!user.isVerified) {
      return res.status(403).json({ mensaje: 'Por favor, verifica tu correo antes de iniciar sesión.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ mensaje: 'Correo o contraseña incorrectos.' });
    }

    const payload = { user: { id: user._id, roles: user.roles } };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '30d' },
      (error, token) => {
        if (error) throw error;
        console.log("¡Login Exitoso!");
        res.status(200).json({
          mensaje: 'Inicio de sesión exitoso',
          token: token,
          user: { id: user._id, name: user.name, email: user.email, roles: user.roles }
        });
      }
    );
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ mensaje: 'Hubo un error en el servidor.' });
  }
});

// 4. RECUPERAR CONTRASEÑA
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    const usuario = await User.findOne({ email: email.toLowerCase().trim() });
    if (!usuario) {
      return res.status(404).json({ mensaje: 'No existe ninguna cuenta con este correo electrónico.' });
    }

    // Opcional: También podemos impedir que usuarios baneados recuperen su contraseña
    if (usuario.baneado) {
      return res.status(403).json({ 
        mensaje: 'Las cuentas suspendidas no pueden restablecer su contraseña.' 
      });
    }

    // 1. Generamos un nuevo código de 6 dígitos
    const codigoVerificacion = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Lo guardamos en la base de datos temporalmente
    usuario.verificationToken = codigoVerificacion;
    await usuario.save();

    // 3. Enviamos el correo de recuperación
    await transporter.sendMail({
      from: '"HarriFitness Seguridad" <tu_correo@gmail.com>', // Usa el correo de tus variables de entorno
      to: usuario.email,
      subject: 'Recuperación de Contraseña - HarriFitness',
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; color: #333;">
          <h2 style="color: #E74C3C;">Recuperación de cuenta</h2>
          <p>Hola, ${usuario.name}. Has solicitado restablecer tu contraseña.</p>
          <p>Tu código de seguridad de 6 dígitos es:</p>
          <h1 style="background: #f4f4f4; padding: 15px; letter-spacing: 5px; border-radius: 10px;">${codigoVerificacion}</h1>
          <p>Ingresa este código en la aplicación para crear una nueva contraseña.</p>
          <p style="font-size: 12px; color: #999; margin-top: 20px;">Si no solicitaste este cambio, ignora este correo.</p>
        </div>
      `
    });

    console.log(`Código de recuperación enviado a ${usuario.email}`);
    res.status(200).json({ mensaje: 'Código de verificación enviado al correo.' });

  } catch (error) {
    console.error("Error en forgot-password:", error);
    res.status(500).json({ mensaje: 'Error en el servidor al enviar el correo.' });
  }
});


// 5. RESTABLECER CONTRASEÑA (Ajustada para recibir "nuevaPassword")
router.post('/reset-password', async (req, res) => {
  try {
    const { email, nuevaPassword } = req.body; // Cambiado a 'nuevaPassword' para hacer match con React Native

    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(nuevaPassword)) {
      return res.status(400).json({ mensaje: 'La nueva contraseña debe tener al menos 8 caracteres, incluir una letra y un número.' });
    }

    let usuario = await User.findOne({ email: email.toLowerCase().trim() });
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    // Encriptamos la nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordEncriptada = await bcrypt.hash(nuevaPassword, salt);

    // Actualizamos la base de datos
    await User.updateOne(
      { _id: usuario._id },
      { $set: { password: passwordEncriptada } }
    );
    
    console.log(`Contraseña actualizada para ${usuario.email}`);
    res.status(200).json({ mensaje: 'Contraseña restablecida con éxito.' });

  } catch (error) {
    console.error("Error en reset-password:", error);
    res.status(500).json({ mensaje: 'Error al actualizar la contraseña.' });
  }
});

// PUT: Banear/Desbanear a un Usuario (Desde la sección de comentarios)
router.put('/toggle-ban/:id', auth, async (req, res) => {
  try {
    // 1. Identificamos al miembro del Staff
    const admin = await User.findById(req.user.id);
    const esAdmin = admin.roles.includes('admin');
    const esModerador = admin.roles.includes('moderator') || admin.roles.includes('moderador');

    if (!esAdmin && !esModerador) {
      return res.status(403).json({ mensaje: 'No tienes permisos para realizar esta acción.' });
    }

    const rolAutor = esAdmin ? 'admin' : 'moderador';

    // 2. Buscamos al usuario objetivo
    const usuarioABanear = await User.findById(req.params.id);
    if (!usuarioABanear) {
      return res.status(404).json({ mensaje: "Usuario no encontrado en la base de datos" });
    }

    // 🔥 3. VALIDACIÓN DE JERARQUÍA AL DESBANEAR
    if (usuarioABanear.baneado) {
      const registroBaneo = await Baneo.findOne({ usuario: req.params.id });
      
      if (registroBaneo && registroBaneo.baneadoPorRol === 'admin' && !esAdmin) {
        return res.status(403).json({ 
          mensaje: 'Acceso Denegado: Este usuario fue suspendido por un Administrador.' 
        });
      }
    }

    // 4. Invertimos el estado de baneo
    usuarioABanear.baneado = !usuarioABanear.baneado;
    await usuarioABanear.save();

   // 🔥 5. Consecuencias del baneo/desbaneo
    if (usuarioABanear.baneado) {
      // (Aquí está tu código de Articulo.updateMany...)
      // (Aquí está tu código de nuevoBaneo.save()...)

      // Registramos el baneo directo en el Historial de Resueltos
      await Reporte.create({
        usuarioReportado: usuarioABanear.name || usuarioABanear.email,
        usuarioQueReporta: req.user.id,
        tipoContenido: 'usuario',
        motivo: 'Baneo directo por el Staff',
        comentario: 'Usuario suspendido desde la sección de artículos',
        estado: 'resuelto', // Entra directo al Historial
        accionTomada: 'Usuario Baneado',
        fechaRaw: Date.now()
      });

    } else {
      // Si lo desbanearon, borramos el historial
      await Baneo.findOneAndDelete({ usuario: usuarioABanear._id });
    }

    res.status(200).json({ 
      mensaje: usuarioABanear.baneado ? 'Usuario suspendido y comentarios eliminados' : 'Usuario desbaneado',
      baneado: usuarioABanear.baneado
    });
  } catch (error) {
    console.error("Error al hacer toggle-ban:", error);
    res.status(500).json({ mensaje: 'Error interno al cambiar estado del usuario' });
  }
});

// PUT: Guarda o actualiza las medidas corporales del usuario
router.put('/perfil/medidas', auth, async (req, res) => {
  try {
    const { peso, altura } = req.body;

    // Validación rápida
    if (!peso && !altura) {
      return res.status(400).json({ mensaje: 'Debes enviar al menos un dato (peso o altura).' });
    }

    // Buscamos al usuario que está logueado usando el ID extraído de su token
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    // Aseguramos que el objeto de estadísticas exista (por si acaso)
    if (!user.estadisticas) {
      user.estadisticas = { caloriasQuemadas: 0, tiempoEntrenado: 0, rutinasCompletadas: 0, peso: "0", altura: "0.00", racha: "0" };
    }

    // Actualizamos solo lo que nos mandaron
    if (peso) user.estadisticas.peso = peso;
    if (altura) user.estadisticas.altura = altura;

    // Guardamos los cambios en MongoDB
    await user.save();

    res.status(200).json({ 
      mensaje: 'Medidas actualizadas correctamente.',
      estadisticas: user.estadisticas 
    });

  } catch (error) {
    console.error("Error al actualizar medidas:", error);
    res.status(500).json({ mensaje: 'Error interno del servidor al guardar medidas.' });
  }
});

module.exports = router;