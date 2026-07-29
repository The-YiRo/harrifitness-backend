const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // 1. Leer el token del header de la petición
  const token = req.header('x-auth-token');

  // 2. Si no hay token, denegamos el acceso
  if (!token) {
    return res.status(401).json({ mensaje: 'No hay token, permiso denegado.' });
  }

  // 3. Validar el token
  try {
    const cifrado = jwt.verify(token, process.env.JWT_SECRET);
    req.user = cifrado.user; // Extraemos el ID del usuario
    next(); // Damos paso a la ruta
  } catch (error) {
    res.status(401).json({ mensaje: 'Token no válido o expirado.' });
  }
};