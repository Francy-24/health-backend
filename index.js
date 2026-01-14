/*const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

const GROQ_API_KEY = "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";

app.post("/analyze", async (req, res) => {
  const { bpm, temperature, spo2, age, weight, history } = req.body;
  console.log("requete received:",req.body);

  const prompt = `
you are a medical assistant

Patient :
Age: ${age}
Weight: ${weight}
History: ${history}
BPM: ${bpm}
Temperature: ${temperature}
SpO2: ${spo2}

Analysis :
1. General condition
2. Risks
3. Recommendations
4. Urgency (low / mmoderate / critical)
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

    res.json({
      analysis: response.data.choices[0].message.content,
    });
  } catch (error) {
    console.error("Error AI:",error.response?.data||error.message);
    res.status(500).json({ error: "Error AI" });
  }
});

app.listen(3000, () => {
  console.log("Backend ready http://localhost:3000");
});*/

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const nodemailer = require("nodemailer");

const app = express();
app.use(cors());
app.use(express.json());

// 🔐 Groq API Key
const GROQ_API_KEY = "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";

// 📧 Nodemailer configuration with Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "francykakira@gmail.com",        // Your Gmail address
    pass: "bymumbgjhsznlavh",              // Your Gmail app password
  },
});

app.post("/analyze", async (req, res) => {
  const { bpm, temperature, spo2, age, weight, history, emergency } = req.body;
  console.log("📥 Request received:", req.body);

  const prompt = `
You are a medical assistant.

Patient:
Age: ${age}
Weight: ${weight}
History: ${history}
BPM: ${bpm}
Temperature: ${temperature}
SpO2: ${spo2}

Please provide:
1. General condition
2. Potential risks
3. Recommendations
4. Urgency level (low / moderate / critical)
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

    const analysis = response.data.choices[0].message.content;
    res.json({ analysis });

    // 🔔 Send email alert if "critical" is detected
    if (analysis.toLowerCase().includes("critical")) {
      const mailOptions = {
        from: "francykakira@gmail.com",
        to: emergency, // Replace with the doctor's or relative's email
        subject: "⚠️ Critical Medical Alert",
        text: `A critical medical condition has been detected for the patient.\n\nAnalysis:\n${analysis}`,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error(" Email sending error:", error);
        } else {
          console.log("Alert email sent:", info.response);
        }
      });
    }

  } catch (error) {
    console.error(" AI error:", error.response?.data || error.message);
    res.status(500).json({ error: "AI error" });
  }
});

app.listen(3000, () => {
  console.log(" Backend running at http://localhost:3000");
});