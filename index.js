const express = require("express");
const cors = require("cors");
const axios = require("axios");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Groq API Key from environment
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Nodemailer configuration with Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD,
  },
});

// Fonction pour calculer l'âge
function calculateAge(birthDateString) {
  const birthDate = new Date(birthDateString);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// 🔍 Route d'analyse médicale
app.post("/analyze", async (req, res) => {
  const { name, bpm, temperature, spo2, birthDate, weight, history, emergency, address } = req.body;
  const age = calculateAge(birthDate);

  const prompt = `
You are a professional medical assistant AI.

Patient information:
- name: ${name}
- Age: ${age}
- Weight: ${weight} kg
- Medical History: ${history}
- Heart Rate (BPM): ${bpm}
- Body Temperature (°C): ${temperature}
- Oxygen Saturation (SpO₂): ${spo2}%

Your task is to:
1. Address ${name} directly using their first name.
2. Give simple and easy-to-understand advice (examples: "drink water," "rest," "go to the hospital," "call an ambulance," "lie on your side," etc.).
3. State whether their condition is normal, needs monitoring, or is critical.
4. If it is critical, clearly state that an ambulance must be called or they must go to the hospital.
5. Use simple language, without medical jargon, as if you were speaking to someone who is not a doctor.
6. Never end with a question or phrase like "can I help you any further?" or "Do you need something else?"

Answer in English, clearly, directly, and reassuringly.
`;

  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const rawAnalysis = response.data.choices[0].message.content;
    const analysis = rawAnalysis.replace(/\*/g, '');
    res.json({ analysis });

    // Envoi d'alerte si "critical" détecté
    if (analysis.toLowerCase().includes("critical")) {
      const mailOptions = {
        from: "francykakira@gmail.com",
        to: emergency,
        subject: "⚠️ Critical Medical Alert",
        text: `A critical medical condition has been detected for ${name}.\n\nAnalysis:\n${analysis}\n\nLocation: ${address || "Not available"}\n\nPlease take immediate action.`,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Email sending error:", error);
        } else {
          console.log("Alert email sent:", info.response);
        }
      });
    }

  } catch (error) {
    console.error("AI error:", error.response?.data || error.message);
    res.status(500).json({ error: "AI error" });
  }
});

// 🔮 Route de prédiction à partir d'une analyse existante
app.post("/predict", async (req, res) => {
  const { analysis } = req.body;

  if (!analysis) {
    return res.status(400).json({ error: "Missing analysis text" });
  }

  const prompt = `
You are a medical AI specialized in health risk prediction.

Here is a previous health analysis:
"${analysis}"

Based on this analysis, predict if the person is at risk of developing a health issue today. Be clear, concise, and use simple language. End with a preventive recommendation.

Do not ask questions. Do not offer further help.
`;

  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const rawPrediction = response.data.choices[0].message.content;
    const prediction = rawPrediction.replace(/\*/g, '');
    res.json({ prediction });
  } catch (error) {
    console.error("Prediction error:", error.response?.data || error.message);
    res.status(500).json({ error: "Prediction error" });
  }
});

// 🚀 Lancer le serveur
app.listen(3000, () => {
  console.log("Backend running at http://localhost:3000");
});