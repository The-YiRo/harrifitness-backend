const express = require('express');
const router = express.Router();
const Reporte = require('../models/Reporte');
const Baneo = require('../models/Baneo');
const auth = require('../middleware/auth');
const User = require('../models/User');
const { obtenerPendientes, obtenerHistorial } = require('../utils/adminService');
const Articulo = require('../models/Articulo');

router.get('/pendientes', async (req, res) => {
  try {
    const pendientes = await obtenerPendientes();
    res.status(200).json({ pendientes });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al cargar los pendientes' });
  }
});

router.get('/historial', async (req, res) => {
  try {
    const historial = await obtenerHistorial();
    res.status(200).json(historial);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al cargar el historial' });
  }
});

router.put('/ignorar/:id', async (req, res) => {
  try {
    const reporte = await Reporte.findByIdAndUpdate(
      req.params.id,
      { estado: 'resuelto', accionTomada: 'Ignorado', fechaRaw: Date.now() },
      { returnDocument: 'after' }
    );
    res.status(200).json({ mensaje: 'Reporte ignorado', reporte });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al procesar' });
  }
});

router.put('/eliminar-contenido/:id', auth, async (req, res) => {
  try {
    const reporte = await Reporte.findById(req.params.id);
    if (!reporte) return res.status(404).json({ mensaje: 'Reporte no encontrado' });

    if (reporte.tipoContenido === 'comentario' && reporte.contenidoId) {
      await Articulo.updateMany(
        {}, 
        { $pull: { comentarios: { _id: reporte.contenidoId } } }
      );
    }

    reporte.estado = 'resuelto';
    reporte.accionTomada = 'Comentario Eliminado';
    reporte.fechaRaw = Date.now();
    await reporte.save();

    res.status(200).json({ mensaje: 'Comentario eliminado y reporte resuelto', reporte });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al procesar la eliminación' });
  }
});

router.post('/banear', auth, async (req, res) => {
  try {
    const { idReporte, usuario, motivo } = req.body;

    const autorBaneo = await User.findById(req.user.id);
    const rolAutor = autorBaneo.roles.includes('admin') ? 'admin' : 'moderador';

    const usuarioActualizado = await User.findByIdAndUpdate(usuario, { 
      baneado: true 
    }, { returnDocument: 'after' });

    if (!usuarioActualizado) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

    await Articulo.updateMany(
      {},
      { 
        $pull: { 
          comentarios: { 
            $or: [
              { usuarioId: usuarioActualizado._id },
              { usuarioId: usuarioActualizado._id.toString() },
              { autor: usuarioActualizado.name },
              { autor: usuarioActualizado.email }
            ]
          } 
        } 
      }
    );

    const nuevoBaneo = new Baneo({ 
      usuario, 
      motivo: motivo || "Violación de normas",
      fechaRaw: Date.now(),
      baneadoPorRol: rolAutor 
    });
    await nuevoBaneo.save();

    if (idReporte) {
      await Reporte.findByIdAndUpdate(idReporte, {
        estado: 'resuelto',
        accionTomada: 'Usuario Baneado',
        fechaRaw: Date.now()
      });
    }

    res.status(200).json({ mensaje: 'Usuario suspendido y todos sus comentarios eliminados.' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error en el servidor.' });
  }
});

router.put('/rectificar/:id', async (req, res) => {
  try {
    const reporte = await Reporte.findByIdAndUpdate(
      req.params.id,
      { estado: 'pendiente', accionTomada: null, fechaRaw: Date.now() },
      { returnDocument: 'after' }
    );
    res.status(200).json({ mensaje: 'Reporte enviado a pendientes', reporte });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al rectificar' });
  }
});

router.delete('/desbanear/:id', auth, async (req, res) => {
  try {
    const usuarioPeticion = await User.findById(req.user.id);
    const esAdmin = usuarioPeticion.roles.includes('admin');
    const esModerador = usuarioPeticion.roles.includes('moderator') || usuarioPeticion.roles.includes('moderador');

    if (!esAdmin && !esModerador) {
      return res.status(403).json({ mensaje: 'No tienes permisos para realizar esta acción.' });
    }

    let registroBaneo = await Baneo.findById(req.params.id).catch(() => null);
    let userId = null;

    if (registroBaneo) {
       userId = registroBaneo.usuario;
    } else {
       registroBaneo = await Baneo.findOne({ usuario: req.params.id }).catch(() => null);
       if (registroBaneo) userId = registroBaneo.usuario;
    }

    if (!userId) {
      userId = req.params.id; 
    }

    if (registroBaneo && registroBaneo.baneadoPorRol === 'admin' && !esAdmin) {
      return res.status(403).json({ 
        mensaje: 'Acceso Denegado: Este usuario fue suspendido por la Administración. Solo un Administrador puede levantar el castigo.' 
      });
    }

    await User.findByIdAndUpdate(userId, { baneado: false });
    if (registroBaneo) {
      await Baneo.findByIdAndDelete(registroBaneo._id);
    }

    res.status(200).json({ mensaje: 'Usuario desbaneado con éxito' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error interno al intentar desbanear' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { usuarioReportado, contenidoId, tipoContenido, motivo, comentario } = req.body;

    const nuevoReporte = new Reporte({
      usuarioReportado,
      usuarioQueReporta: req.user.id, 
      contenidoId,
      tipoContenido,
      motivo,
      comentario,
      estado: 'pendiente', 
      fechaRaw: Date.now() 
    });

    await nuevoReporte.save();

    res.status(201).json({ mensaje: 'Gracias por tu reporte. El Staff de HarriFitness revisará la situación.' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al procesar el reporte en el servidor.' });
  }
});

module.exports = router;