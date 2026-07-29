const express = require('express');
const router = express.Router();
const Notificacion = require('../models/Notificacion');

// GET: Obtener las notificaciones del usuario (Globales + Personales)
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const notificaciones = await Notificacion.find({
      $or: [
        { usuarioId: userId },
        { usuarioId: null }
      ]
    }).sort({ createdAt: -1 }).limit(30);

    // Mapeamos para indicar si este usuario ya la leyó (Corregido para ObjectIds de Mongo)
    const notificacionesConEstado = notificaciones.map(notif => {
      // 🛡️ MAGIA: Nos aseguramos de que leidaPor sea un arreglo y convertimos los ObjectIds a String
      const listaLeidos = Array.isArray(notif.leidaPor) ? notif.leidaPor : [];
      const leida = listaLeidos.some(idLeido => idLeido.toString() === userId.toString());
      
      return {
        _id: notif._id,
        tipo: notif.tipo,
        titulo: notif.titulo,
        mensaje: notif.mensaje,
        fecha: notif.createdAt,
        leida: leida
      };
    });

    res.status(200).json(notificacionesConEstado);
  } catch (error) {
    console.error("Error al obtener notificaciones:", error);
    res.status(500).json({ mensaje: 'Error en el servidor' });
  }
});

// PUT: Marcar una notificación como leída
router.put('/:id/leer', async (req, res) => {
  try {
    const { userId } = req.body; 
    const notificacionId = req.params.id;

    // Agregamos al usuario al arreglo de 'leidaPor' usando $addToSet para que no se duplique
    await Notificacion.findByIdAndUpdate(
      notificacionId,
      { $addToSet: { leidaPor: userId } }
    );

    res.status(200).json({ mensaje: 'Notificación marcada como leída' });
  } catch (error) {
    console.error("Error al marcar notificación:", error);
    res.status(500).json({ mensaje: 'Error en el servidor' });
  }
});

module.exports = router;