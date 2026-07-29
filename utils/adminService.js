// HARRIFITNESS-BACKEND/utils/adminService.js
const Reporte = require('../models/Reporte');
const User = require('../models/User');

const obtenerPendientes = async () => {
  try {
    const pendientes = await Reporte.find({ estado: 'pendiente' }).sort({ fechaRaw: -1 });
    return pendientes;
  } catch (error) {
    throw new Error('Error al obtener pendientes');
  }
};

const obtenerHistorial = async () => {
  try {
    const [resueltos, usuariosSuspendidos] = await Promise.all([
      Reporte.find({ estado: 'resuelto' }).sort({ fechaRaw: -1 }),
      User.find({ baneado: true })
    ]);

    const baneados = usuariosSuspendidos.map(user => ({
      _id: user._id,
      usuario: user.name || user.email,
      motivo: "Suspensión administrativa",
      fechaRaw: user.updatedAt || Date.now()
    }));

    return { resueltos, baneados };
  } catch (error) {
    throw new Error('Error al obtener el historial');
  }
};

// ESTA ES LA PARTE CRÍTICA QUE EVITA EL ERROR:
module.exports = {
  obtenerPendientes,
  obtenerHistorial
};