const express = require('express');
const router = express.Router();
const Articulo = require('../models/Articulo');
const Notificacion = require('../models/Notificacion');
const User = require('../models/User');
const auth = require('../middleware/auth');
const Reporte = require('../models/Reporte');

router.get('/', async (req, res) => {
  try {
    const buscar = req.query.buscar; 
    let filtro = { oculto: false };

    if (buscar) {
      filtro.$or = [
        { titulo: { $regex: buscar, $options: 'i' } },
        { categoria: { $regex: buscar, $options: 'i' } },
        { contenido: { $regex: buscar, $options: 'i' } }
      ];
    }

    const articulos = await Articulo.find(filtro).sort({ createdAt: -1 });
    res.json(articulos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Error interno en el servidor.' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { titulo, extracto, contenido, categoria, imagen } = req.body;
    const usuario = await User.findById(req.user.id);

    const nuevoArticulo = new Articulo({
      titulo,
      extracto,
      contenido,
      categoria,
      imagen,
      autor: usuario.name,
      autorId: usuario._id
    });

    await nuevoArticulo.save();

    try {
      await Notificacion.create({
        usuarioId: null, 
        tipo: 'blog',
        titulo: 'Nuevo Artículo Publicado 📝',
        mensaje: `Descubre más sobre ${categoria}: ${titulo}`
      });
    } catch (err) {}

    res.status(201).json({ mensaje: 'Artículo publicado con éxito', articulo: nuevoArticulo });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al publicar el artículo' });
  }
});

// 🔥 MAGIA DE BLOQUEOS APLICADA AQUÍ DIRECTAMENTE A MONGODB
router.put('/:id/toggle-ocultar', auth, async (req, res) => {
  try {
    const articulo = await Articulo.findById(req.params.id);
    if (!articulo) {
      return res.status(404).json({ msg: 'Artículo no encontrado' });
    }

    // Identificamos quién está accionando
    const usuarioPeticion = await User.findById(req.user.id);
    const esAdmin = usuarioPeticion.roles.includes('admin');
    const rolActual = esAdmin ? 'admin' : 'moderador';

    let nuevoEstadoOculto = !articulo.oculto;
    let rolParaGuardar = nuevoEstadoOculto ? rolActual : null;

    // BLOQUEO: Si se intenta restaurar y fue ocultado por Admin -> Bloqueado a menos que seas Admin
    if (!nuevoEstadoOculto && articulo.get('ocultadoPorRol') === 'admin' && !esAdmin) {
      return res.status(403).json({ msg: "Acceso Denegado: Este artículo fue bloqueado por la Administración. Solo un Admin puede restaurarlo." });
    }

    // Usamos updateOne para forzar la escritura en BD aunque no esté en el modelo estricto
    await Articulo.updateOne(
        { _id: req.params.id },
        { $set: { oculto: nuevoEstadoOculto, ocultadoPorRol: rolParaGuardar } }
    );

    const articuloActualizado = await Articulo.findById(req.params.id);

    if (nuevoEstadoOculto) {
      await Reporte.create({
        usuarioReportado: articuloActualizado.autor || "Autor Desconocido",
        usuarioQueReporta: req.user.id,
        contenidoId: articuloActualizado._id,
        tipoContenido: 'articulo',
        motivo: 'Baja pública de contenido',
        comentario: `Artículo ocultado: ${articuloActualizado.titulo || 'Sin Título'}`,
        estado: 'resuelto', 
        accionTomada: 'Ocultado por el Staff',
        fechaRaw: Date.now()
      }).catch(err => console.log("Advertencia: No se pudo auto-reportar"));
    }

    res.json({ 
      msg: articuloActualizado.oculto ? 'Artículo ocultado de la comunidad' : 'Artículo restaurado y público',
      articulo: articuloActualizado 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Error interno en el servidor' });
  }
});

router.get('/gestion', auth, async (req, res) => {
  try {
    // Retorna todos, ya incluye dinámicamente ocultadoPorRol gracias a Mongoose lean()
    const articulos = await Articulo.find().sort({ createdAt: -1 }).lean();
    res.json(articulos);
  } catch (error) {
    res.status(500).json({ msg: 'Error en el servidor' });
  }
});

router.post('/:id/comentarios', auth, async (req, res) => {
  try {
    const { texto } = req.body;
    if (!texto || texto.trim() === '') return res.status(400).json({ mensaje: 'El comentario no puede estar vacío.' });

    const articulo = await Articulo.findById(req.params.id);
    if (!articulo) return res.status(404).json({ mensaje: 'Artículo no encontrado.' });

    const usuario = await User.findById(req.user.id);
    const nuevoComentario = {
      autor: usuario.name || usuario.email,
      texto: texto,
      fecha: new Date(),
      usuarioId: usuario._id 
    };

    articulo.comentarios.push(nuevoComentario);
    await articulo.save();
    res.status(201).json({ mensaje: 'Comentario agregado con éxito', comentario: nuevoComentario });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error en el servidor.' });
  }
});

router.delete('/:id/comentarios/:comentarioId', auth, async (req, res) => {
  try {
    const articulo = await Articulo.findById(req.params.id);
    if (!articulo) return res.status(404).json({ mensaje: 'Artículo no encontrado.' });

    const comentario = articulo.comentarios.find((c) => c._id.toString() === req.params.comentarioId);
    if (!comentario) return res.status(404).json({ mensaje: 'Comentario no encontrado.' });

    const usuarioPeticion = await User.findById(req.user.id);
    const esDueño = comentario.usuarioId && comentario.usuarioId.toString() === req.user.id;
    const esStaff = usuarioPeticion.roles.includes('admin') || usuarioPeticion.roles.includes('moderator');

    if (!esDueño && !esStaff) {
      return res.status(403).json({ mensaje: 'No tienes permisos para borrar este comentario.' });
    }

    articulo.comentarios = articulo.comentarios.filter((c) => c._id.toString() !== req.params.comentarioId);
    await articulo.save();
    res.json({ mensaje: 'Comentario eliminado correctamente.' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error en el servidor al intentar borrar.' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { titulo, extracto, contenido, categoria, imagen } = req.body;
    let articulo = await Articulo.findById(req.params.id);
    if (!articulo) return res.status(404).json({ mensaje: 'Artículo no encontrado.' });

    const usuarioPeticion = await User.findById(req.user.id);
    const esDueño = articulo.autorId && articulo.autorId.toString() === req.user.id;
    const esStaff = usuarioPeticion && usuarioPeticion.roles && (usuarioPeticion.roles.includes('admin') || usuarioPeticion.roles.includes('editor'));

    if (!esDueño && !esStaff) {
      return res.status(403).json({ mensaje: 'No tienes permisos para editar este artículo.' });
    }

    if (titulo) articulo.titulo = titulo;
    if (extracto) articulo.extracto = extracto;
    if (contenido) articulo.contenido = contenido;
    if (categoria) articulo.categoria = categoria;
    if (imagen) articulo.imagen = imagen; 

    await articulo.save();
    res.json({ mensaje: 'Artículo actualizado con éxito.', articulo });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error interno al actualizar el artículo.' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const articulo = await Articulo.findById(req.params.id);
    if (!articulo) return res.status(404).json({ mensaje: 'Artículo no encontrado.' });

    const usuarioPeticion = await User.findById(req.user.id);
    const esDueño = articulo.autorId && articulo.autorId.toString() === req.user.id;
    const esStaff = usuarioPeticion && usuarioPeticion.roles && (
      usuarioPeticion.roles.includes('admin') || 
      usuarioPeticion.roles.includes('moderator') || 
      usuarioPeticion.roles.includes('editor')
    );

    if (!esDueño && !esStaff) {
      return res.status(403).json({ mensaje: 'No tienes permisos para eliminar este artículo.' });
    }

    await Articulo.findByIdAndDelete(req.params.id);
    res.json({ mensaje: 'Artículo eliminado permanentemente.' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error en el servidor al intentar eliminar.' });
  }
});

module.exports = router;