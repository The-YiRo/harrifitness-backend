const express = require('express');
const router = express.Router();
const Rutina = require('../models/Rutina');
const Notificacion = require('../models/Notificacion');

// 1. CREAR UNA NUEVA RUTINA (POST /api/rutinas/crear)
router.post('/crear', async (req, res) => {
  console.log("¡Backend recibió petición POST en /crear!");
  try {
    const { titulo, descripcion, nivel, tiempo, calorias, videoUrl, videoId } = req.body;

    const nuevaRutina = new Rutina({
      titulo,
      descripcion,
      nivel,
      tiempo,
      calorias,
      videoUrl,
      videoId
    });

    await nuevaRutina.save();
    console.log("¡Rutina guardada exitosamente en MongoDB Atlas!");

    // DISPARAR NOTIFICACIÓN GLOBAL A TODOS LOS USUARIOS
    try {
      await Notificacion.create({
        usuarioId: null, // Null significa que le aparecerá a TODOS
        tipo: 'video',
        titulo: 'Nueva Rutina Publicada 🎥',
        mensaje: `Ya puedes entrenar con: ${nuevaRutina.titulo}`
      });
      console.log("¡Notificación global enviada!");
    } catch (notifError) {
      console.error("Error al crear la notificación:", notifError);
      // No bloqueamos la respuesta principal si falla solo la notificación
    }

    res.status(201).json({ mensaje: '¡Rutina creada exitosamente!', rutina: nuevaRutina });

  } catch (error) {
    console.error("Error crítico en el backend:", error);
    res.status(500).json({ mensaje: 'Error interno en el servidor.' });
  }
});

// 2. OBTENER RUTINAS (GET /api/rutinas)
router.get('/', async (req, res) => {
  console.log("📥 El frontend está pidiendo las rutinas..."); 
  try {
    const verTodas = req.query.verTodas === 'true';
    const buscar = req.query.buscar; // Capturamos lo que el usuario escribe

    // Filtro base: Si no es staff/verTodas, mostramos solo las activas
    let filtro = verTodas ? {} : { estaActiva: { $ne: false } };

    // Si el usuario buscó una palabra, se la agregamos al filtro
    if (buscar) {
      filtro.titulo = { $regex: buscar, $options: 'i' }; 
    }

    const rutinas = await Rutina.find(filtro).sort({ fechaCreacion: -1 }); 
    console.log(`✅ Se encontraron ${rutinas.length} rutinas en la base de datos.`);
    res.status(200).json(rutinas);
  } catch (error) {
    console.error("❌ Error grave en el servidor:", error);
    res.status(500).json({ mensaje: 'Error al cargar rutinas' });
  }
});

// 3. ACTUALIZAR UNA RUTINA (PUT /api/rutinas/:id)
router.put('/:id', async (req, res) => {
  console.log(`📥 Petición para actualizar rutina: ${req.params.id}`);
  try {
    const { titulo, descripcion, nivel, tiempo, calorias, videoUrl, videoId } = req.body;

    const rutinaActualizada = await Rutina.findByIdAndUpdate(
      req.params.id,
      { titulo, descripcion, nivel, tiempo, calorias, videoUrl, videoId },
      { returnDocument: 'after' } 
    );

    if (!rutinaActualizada) {
      return res.status(404).json({ mensaje: 'Rutina no encontrada' });
    }

    res.status(200).json({ mensaje: 'Rutina actualizada', rutina: rutinaActualizada });
  } catch (error) {
    console.error("❌ Error al actualizar rutina:", error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

// PUT: Registrar una vista completa de la rutina
router.put('/:id/vista', async (req, res) => {
  try {
    // Busca la rutina por ID y le suma 1 al campo "vistas" ($inc es incrementar)
    const rutinaActualizada = await Rutina.findByIdAndUpdate(
      req.params.id,
      { $inc: { vistas: 1 } },
      { returnDocument: 'after' }
    );

    if (!rutinaActualizada) {
      return res.status(404).json({ mensaje: 'Rutina no encontrada' });
    }

    res.status(200).json({ 
      mensaje: 'Vista registrada con éxito', 
      vistasTotales: rutinaActualizada.vistas 
    });
  } catch (error) {
    console.error("Error registrando vista:", error);
    res.status(500).json({ mensaje: 'Error al registrar la vista' });
  }
});

// 4. OCULTAR (BORRADO LÓGICO) EN LUGAR DE ELIMINAR (DELETE /api/rutinas/:id)
router.delete('/:id', async (req, res) => {
  try {
    const rutina = await Rutina.findByIdAndUpdate(req.params.id, { estaActiva: false }, { returnDocument: 'after' });
    if (!rutina) return res.status(404).json({ mensaje: 'Rutina no encontrada' });
    res.status(200).json({ mensaje: 'Rutina oculta correctamente' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al ocultar la rutina' });
  }
});

// 5. RESTAURAR UNA RUTINA OCULTA (PUT /api/rutinas/restaurar/:id)
router.put('/restaurar/:id', async (req, res) => {
  console.log(`📥 Petición para RESTAURAR rutina: ${req.params.id}`);
  try {
    const rutinaRestaurada = await Rutina.findByIdAndUpdate(
      req.params.id,
      { estaActiva: true },
      { returnDocument: 'after' }
    );

    if (!rutinaRestaurada) {
      return res.status(404).json({ mensaje: 'Rutina no encontrada' });
    }

    res.status(200).json({ mensaje: 'Rutina restaurada', rutina: rutinaRestaurada });
  } catch (error) {
    console.error("❌ Error al restaurar rutina:", error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

module.exports = router;