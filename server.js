
import express from "express";

const app = express();
app.use(express.json({ limit: "50kb" }));

const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

app.get("/", (_req, res) => {
  res.send("ARCHON AI backend is online.");
});

app.post("/api/chat", async (req, res) => {
  try {
    if (!GROQ_API_KEY) {
      return res.status(500).json({ error: "AI key is not configured." });
    }

    const messages = req.body?.messages;

    if (
      !Array.isArray(messages) ||
      messages.length === 0 ||
      messages.length > 12 ||
      messages.some(
        (m) =>
          !m ||
          !["user", "assistant"].includes(m.role) ||
          typeof m.content !== "string" ||
          m.content.length > 4000
      )
    ) {
      return res.status(400).json({ error: "Invalid chat messages." });
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content:
                "You are ARCHON, a helpful, friendly general-purpose AI assistant. Be clear, accurate, and useful."
            },
            ...messages
          ],
          max_tokens: 800
        }),
        signal: AbortSignal.timeout(25000)
      }
    );

    if (!response.ok) {
      console.error("Groq API returned status:", response.status);
      return res.status(502).json({
        error: "The AI provider could not complete the request."
      });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;

    if (typeof reply !== "string") {
      return res.status(502).json({ error: "Invalid AI response." });
    }

    res.json({ reply });
  } catch (error) {
    console.error("Chat request failed:", error.message);
    res.status(500).json({ error: "Could not connect to the AI." });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`ARCHON backend listening on port ${PORT}`);
});
