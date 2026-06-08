const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');

// Inicializamos Groq leyendo la llave de tu .env
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.post('/mensaje', async (req, res) => {
  try {
    const { prompt } = req.body;

    // Hacemos la petición a la IA de Meta (Llama 3)
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Eres el asistente virtual oficial de la aplicación HarriFitness. 
          Tu objetivo exclusivo es ayudar a los usuarios con rutinas de ejercicio, recomendaciones de salud deportiva, motivación para el entrenamiento y dudas sobre el uso de la app.
          REGLA ESTRICTA: Tienes prohibido responder preguntas sobre política, programación, historia general, matemáticas o cualquier tema que no esté relacionado con el fitness. 
          Si el usuario te pregunta algo fuera de este contexto, debes responder educadamente: "Lo siento, soy el asistente exclusivo de HarriFitness y solo puedo ayudarte con temas de entrenamiento, salud deportiva o el uso de nuestra aplicación."`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama-3.1-8b-instant",
    });

    const text = chatCompletion.choices[0]?.message?.content || "No pude generar una respuesta.";

    res.status(200).json({ respuesta: text });
  } catch (error) {
    console.error("Error con la IA Groq:", error);
    res.status(500).json({ mensaje: "Error al procesar la respuesta del asistente." });
  }
});

module.exports = router;