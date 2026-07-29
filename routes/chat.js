const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

// Configuramos el cliente apuntando a OpenRouter
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY, 
});

router.post('/mensaje', async (req, res) => {
  try {
    const { prompt, historial = [], rutinaActual, descripcionRutina, esMensajeInicial, origen } = req.body;

    let mensajeUsuario = prompt;
    let contextoSystem = "";

    const esChatGlobal = origen === 'home' || origen === 'general' || !rutinaActual;

    // 💡 FIX 1: Solo forzamos el análisis inicial si NO es el chat global (es decir, si está en una rutina)
    if (esMensajeInicial && !esChatGlobal) {
      mensajeUsuario = `[Instrucción interna]: El usuario acaba de abrir la rutina específica titulada: "${rutinaActual}". 
      La descripción de esta rutina es: "${descripcionRutina || 'Sin descripción detallada'}". 
      Actúa como su entrenador personal, hazle un análisis rápido y motivador de 2 líneas sobre este video y pregúntale si está listo para empezar o si tiene dudas.`;
    }

    if (esChatGlobal) {
      contextoSystem = `Eres HarriBot, el Coach de IA oficial de la aplicación HarriFitness...`;
    } else {
      contextoSystem = `Eres el asistente virtual oficial de la aplicación HarriFitness para la rutina: "${rutinaActual}"...`;
    }

    let mensajesLlamada = [
      {
        role: "system",
        content: `${contextoSystem}\n\nDIRECTRICES Y REGLAS ESTRICTAS DE COMPORTAMIENTO:
        1. Eres el asistente EXCLUSIVO de HarriFitness.
        2. SÉ DIRECTO, CLARO Y CONCISO: Responde de forma específica a la pregunta del usuario. No des rodeos, no uses introducciones largas ni textos excesivamente extensos. Ve al grano.
        3. CERO IMÁGENES O MULTIMEDIA: Esta interfaz es estrictamente de texto. Tienes ABSOLUTAMENTE PROHIBIDO generar marcadores de imágenes (como <<Img>>, [pic], etc.), enlaces a imágenes, o decir frases como "aquí tienes una imagen".
        4. LÍMITES TEMÁTICOS: Tienes prohibido responder sobre temas que no sean entrenamiento físico, nutrición deportiva o bienestar (nada de política, tecnología, historia, etc.).
        5. SEGURIDAD Y SALUD: Si el usuario menciona lesiones, dolores o limitaciones, recomienda únicamente ejercicios básicos de bajo impacto y aconséjale SIEMPRE visitar a un médico.
        6. MANTÉN LA COHERENCIA: Usa un tono profesional en todo momento. NUNCA inventes información, no uses referencias a la cultura pop (series, anime, películas) y no digas incoherencias.`
      }
    ];

    if (historial.length > 0) {
      mensajesLlamada = mensajesLlamada.concat(historial);
    }

    mensajesLlamada.push({
      role: "user",
      content: mensajeUsuario
    });

    const completion = await openai.chat.completions.create({
      model: "meta-llama/llama-3.1-8b-instruct",
      messages: mensajesLlamada,
      temperature: 0.2,
      top_p: 0.9
    });

    const text = completion.choices[0]?.message?.content || "No pude generar una respuesta.";

    res.status(200).json({ respuesta: text });
  } catch (error) {
    console.error("Error con OpenRouter:", error);
    res.status(500).json({ mensaje: "Error al procesar la respuesta del asistente." });
  }
});

// POST: Generar recomendación rápida para la barra de búsqueda
router.post('/recomendacion-busqueda', async (req, res) => {
  try {
    const { busqueda } = req.body;

    if (!busqueda) {
      return res.status(400).json({ recomendacion: "Escribe algo para que pueda guiarte." });
    }

    // 💡 FIX 2: Reglas estrictas para que no salude y responda rapidísimo
    const completion = await openai.chat.completions.create({
      model: "meta-llama/llama-3.1-8b-instruct", 
      messages: [
        {
          role: "system",
          content: `Eres el Coach de IA de HarriFitness. Da un consejo SÚPER BREVE (máximo 2 líneas) sobre entrenamiento basado en lo que el usuario busca. 
          REGLA ESTRICTA: NO saludes, NO des introducciones (como "aquí tienes tu consejo" o "¡Hola!"), ve directo a la recomendación útil.`
        },
        {
          role: "user",
          content: `Busco rutinas sobre: "${busqueda}"`
        }
      ],
      max_tokens: 80, // Límite de palabras para garantizar velocidad en la barra de búsqueda
    });

    const text = completion.choices[0]?.message?.content || "Busca entre nuestras rutinas para empezar.";

    res.status(200).json({ recomendacion: text });
  } catch (error) {
    console.error("Error en recomendación de búsqueda:", error);
    res.status(500).json({ recomendacion: "No pude cargar el consejo de IA en este momento." });
  }
});

module.exports = router;