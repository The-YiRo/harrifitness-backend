// utils/mailer.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Tu correo: ej. leandro@gmail.com
    pass: process.env.EMAIL_PASS  // Tu contraseña de aplicación de Google
  }
});

module.exports = transporter;