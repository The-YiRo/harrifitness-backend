const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const { obtenerDatosPorEstado } = require('../utils/adminService');

router.get('/usuarios', async (req, res) => {
  try {
    const usuarios = await User.find().select('-password');
    res.status(200).json(usuarios);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener la lista de usuarios' });
  }
});

// 🔥 BUG FIX APLICADO: Soporte total para el arreglo de múltiples roles
router.put('/usuarios/:id/rol', auth, async (req, res) => {
  try {
    const { roles } = req.body; 

    // Verificamos que sí enviaron el arreglo
    if (!roles || !Array.isArray(roles) || roles.length === 0) {
      return res.status(400).json({ mensaje: 'Debes especificar al menos un rol' });
    }

    const usuario = await User.findById(req.params.id);
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    // Le inyectamos el arreglo completo al modelo
    usuario.roles = roles;
    await usuario.save();

    res.status(200).json({ mensaje: 'Roles actualizados con éxito', usuario });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor al actualizar rol' });
  }
});

router.delete('/usuarios/:id', auth, async (req, res) => {
  try {
    const usuarioDesactivado = await User.findByIdAndUpdate(
      req.params.id, 
      { activo: false }, 
      { returnDocument: 'after' }
    );

    if (!usuarioDesactivado) return res.status(404).json({ mensaje: 'El usuario no existe.' });
    res.status(200).json({ mensaje: `La cuenta de ${usuarioDesactivado.name} ha sido dada de baja del sistema.` });

  } catch (error) {
    res.status(500).json({ mensaje: 'Error en el servidor al intentar dar de baja al usuario.' });
  }
});

router.put('/usuarios/:id/toggle-ban', auth, async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (!admin.roles.includes('admin') && !admin.roles.includes('moderator')) {
      return res.status(403).json({ mensaje: 'No tienes permisos para realizar esta acción.' });
    }

    const usuario = await User.findById(req.params.id);
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado.' });

    usuario.baneado = !usuario.baneado;
    await usuario.save();

    const estadoFinal = usuario.baneado ? 'suspendido' : 'restablecido y desbloqueado';
    res.status(200).json({ 
      mensaje: `El usuario ${usuario.name || usuario.email} ha sido ${estadoFinal} con éxito.`,
      baneado: usuario.baneado
    });

  } catch (error) {
    res.status(500).json({ mensaje: 'Error en el servidor al intentar cambiar el estado.' });
  }
});

router.get('/pendientes', auth, async (req, res) => {
    try {
        const datosPendientes = await obtenerDatosPorEstado('pendiente');
        res.status(200).json(datosPendientes);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al cargar los elementos pendientes' });
    }
});

router.get('/historial', auth, async (req, res) => {
    try {
        const datosHistorial = await obtenerDatosPorEstado({ $in: ['resuelto', 'aprobado', 'rechazado'] });
        res.status(200).json(datosHistorial);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al cargar el historial' });
    }
});

module.exports = router;