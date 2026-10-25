
export async function onRequestPost({ request, env }) {
  if (!env.GROQ_API_KEY) {
    return Response.json(
      { error: "AI key is not configured on the server." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    if (!Array.isArray(body.messages) ||
        body.messages.length === 0 ||
        body.messages.length > 20) {
      return Response.json(
        { error: "Invalid conversation." },
        { status: 400 }
      );
    }

    const messages = body.messages
      .filter(m =>
        m &&
        ["user", "assistant"].includes(m.role) &&
        typeof m.content === "string"
      )
      .map(m => ({
        role: m.role,
        content: m.content.slice(0, 4000)
      }));

    if (!messages.length || messages[messages.length - 1].role !== "user") {
      return Response.json(
        { error: "A user message is required." },
        { status: 400 }
      );
    }

    messages.unshift({
      role: "system",
      content:
        "You are ARCHON, a helpful personal AI assistant. " +
        "Be clear, capable, friendly, and honest. " +
        "Never claim to have performed actions you did not perform. " +
        "You may explain how to use tools, but do not claim access " +
        "to the user's device unless a connected tool actually provides it."
    });

    const upstream = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          messages,
          max_completion_tokens: 700
        })
      }
    );

    if (!upstream.ok) {
      return Response.json(
        { error: "The AI provider returned an error. Try again later." },
        { status: 502 }
      );
    }

    const data = await upstream.json();
    const reply = data.choices?.[0]?.message?.content;

    if (typeof reply !== "string") {
      return Response.json(
        { error: "The AI returned an empty response." },
        { status: 502 }
      );
    }

    return Response.json({ reply });
  } catch {
    return Response.json(
      { error: "Unable to contact the AI. Please try again." },
      { status: 500 }
    );
  }
}
