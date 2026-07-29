const { Expo } = require('expo-server-sdk');

// Creamos un nuevo cliente de Expo
let expo = new Expo();

const enviarNotificacionPush = async (tokens, titulo, mensaje, dataExtra = {}) => {
  // Filtramos para asegurarnos de que los tokens son válidos
  let tokensValidos = tokens.filter(token => Expo.isExpoPushToken(token));
  
  if (tokensValidos.length === 0) return;

  // Preparamos los mensajes
  let mensajes = [];
  for (let pushToken of tokensValidos) {
    mensajes.push({
      to: pushToken,
      sound: 'default',
      title: titulo,
      body: mensaje,
      data: dataExtra,
    });
  }

  // Los enviamos en bloques (chunks) para que Expo no se sature
  let chunks = expo.chunkPushNotifications(mensajes);
  
  for (let chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
      console.log(`✅ Notificaciones enviadas a ${chunk.length} dispositivos.`);
    } catch (error) {
      console.error("❌ Error enviando notificación push:", error);
    }
  }
};

module.exports = { enviarNotificacionPush };