const express = require('express');
const router = express.Router();
const Evento = require('../models/Evento');
const Notificacion = require('../models/Notificacion');
const auth = require('../middleware/auth');

// Middleware de ayuda para verificar si es Staff
const esStaff = (req, res, next) => {
  const roles = req.user.roles || [];
  if (roles.includes('admin') || roles.includes('moderador') || roles.includes('moderator') || roles.includes('trainer')) {
    next();
  } else {
    res.status(403).json({ mensaje: 'Acceso denegado: Se requiere rol de Staff' });
  }
};

// 1. GET: Obtener todos los eventos activos (o todos si es staff)
router.get('/', auth, async (req, res) => {
  try {
    const roles = req.user.roles || [];
    const esUsuarioStaff = roles.includes('admin') || roles.includes('moderador') || roles.includes('moderator') || roles.includes('trainer');
    const buscar = req.query.buscar; // Capturamos lo que el usuario escribe
    
    // Filtro base: Si es staff, trae todo. Si no, solo activos.
    let filtro = esUsuarioStaff ? {} : { estaActivo: true };
    
    if (buscar) {
      filtro.$or = [
        { titulo: { $regex: buscar, $options: 'i' } },
        { ubicacion: { $regex: buscar, $options: 'i' } },
        { descripcion: { $regex: buscar, $options: 'i' } }
      ];
    }
    
    const eventos = await Evento.find(filtro).sort({ fecha: 1 }).populate('asistentes', 'name email telefono');

    const eventosFormateados = eventos.map(evento => {
      const opciones = { weekday: 'long', day: 'numeric', month: 'long' };
      const fechaString = new Date(evento.fecha).toLocaleDateString('es-ES', opciones);
      const fechaLista = fechaString.charAt(0).toUpperCase() + fechaString.slice(1);

      return {
        ...evento._doc, 
        fechaFormateada: fechaLista 
      };
    });

    res.status(200).json(eventosFormateados);
  } catch (error) {
    console.error("Error al obtener eventos:", error);
    res.status(500).json({ mensaje: 'Error al obtener la agenda' });
  }
});

// 2. POST: Crear un nuevo evento (Solo Staff)
router.post('/', auth, esStaff, async (req, res) => {
  try {
    const { titulo, fecha, ubicacion, descripcion, imagen } = req.body;

    const nuevoEvento = new Evento({
      titulo,
      fecha,
      ubicacion,
      descripcion: descripcion ? descripcion : "Únete a este increíble evento en HarriFitness.",
      imagen
    });

    await nuevoEvento.save();

    // NOTIFICACIÓN GLOBAL
    try {
      await Notificacion.create({
        usuarioId: null,
        tipo: 'evento',
        titulo: 'Nuevo Evento en la Agenda 📅',
        mensaje: `Únete a nosotros: ${titulo} en ${ubicacion}.`
      });
    } catch (notifError) {
      console.error("Error creando notificación:", notifError);
    }

    res.status(201).json({ mensaje: 'Evento programado exitosamente', evento: nuevoEvento });
  } catch (error) {
    console.error("Error al crear evento:", error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

// 3. RUTAS ESPECÍFICAS DE PUT (Deben ir ANTES del PUT /:id)

// PUT: Alternar asistencia (Cualquier usuario autenticado)
router.put('/asistir/:id', auth, async (req, res) => {
  try {
    const eventoId = req.params.id;
    const userId = req.user.id; 

    const evento = await Evento.findById(eventoId);
    if (!evento) return res.status(404).json({ mensaje: 'Evento no encontrado' });

    const yaAsiste = evento.asistentes.includes(userId);

    if (yaAsiste) {
      evento.asistentes.pull(userId);
    } else {
      evento.asistentes.push(userId);
    }

    await evento.save();
    
    res.status(200).json({ 
      mensaje: yaAsiste ? 'Asistencia cancelada' : 'Asistencia confirmada',
      asistentes: evento.asistentes 
    });
  } catch (error) {
    console.error("Error al procesar asistencia:", error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

// PUT: Ocultar evento (Soft Delete) - Solo Staff
router.put('/ocultar/:id', auth, esStaff, async (req, res) => {
  try {
    const eventoOcultado = await Evento.findByIdAndUpdate(
      req.params.id, 
      { estaActivo: false }, 
      { returnDocument: 'after' }
    );

    if (!eventoOcultado) return res.status(404).json({ mensaje: 'Evento no encontrado' });

    res.status(200).json({ mensaje: 'Evento ocultado correctamente' });
  } catch (error) {
    console.error("Error al ocultar evento:", error);
    res.status(500).json({ mensaje: 'Error interno al ocultar el evento' });
  }
});

// 🔥 NUEVA RUTA PUT: Reactivar evento (Quitar de Baja Pública) - Solo Staff
router.put('/reactivar/:id', auth, esStaff, async (req, res) => {
  try {
    const eventoReactivado = await Evento.findByIdAndUpdate(
      req.params.id, 
      { estaActivo: true }, 
      { returnDocument: 'after' } 
    );

    if (!eventoReactivado) return res.status(404).json({ mensaje: 'Evento no encontrado' });

    res.status(200).json({ mensaje: 'Evento restaurado correctamente' });
  } catch (error) {
    console.error("Error al reactivar evento:", error);
    res.status(500).json({ mensaje: 'Error interno al reactivar el evento' });
  }
});

// 4. RUTAS DINÁMICAS GENERALES (Al final)

// PUT: Editar evento completo (Solo Staff)
router.put('/:id', auth, esStaff, async (req, res) => {
  try {
    const { titulo, fecha, ubicacion, descripcion, imagen } = req.body;

    const eventoActualizado = await Evento.findByIdAndUpdate(
      req.params.id,
      { titulo, fecha, ubicacion, descripcion, imagen },
      { returnDocument: 'after' }
    );

    if (!eventoActualizado) return res.status(404).json({ mensaje: 'Evento no encontrado' });

    res.status(200).json({ mensaje: 'Evento actualizado correctamente', evento: eventoActualizado });
  } catch (error) {
    console.error("Error al editar evento:", error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

// DELETE LÓGICO: Dar de baja el evento sin destruirlo (Solo Staff)
router.delete('/:id', auth, esStaff, async (req, res) => {
  try {
    // Actualizamos el estado a inactivo en lugar de hacer findByIdAndDelete
    const eventoEliminado = await Evento.findByIdAndUpdate(
      req.params.id,
      { estaActivo: false },
      { returnDocument: 'after' }
    );
    
    if (!eventoEliminado) {
      return res.status(404).json({ mensaje: 'Evento no encontrado' });
    }

    res.status(200).json({ mensaje: 'Evento dado de baja (Borrado lógico) correctamente' });
  } catch (error) {
    console.error("Error al dar de baja el evento:", error);
    res.status(500).json({ mensaje: 'Error interno al intentar dar de baja' });
  }
});

module.exports = router;