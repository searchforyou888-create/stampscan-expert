import { Hono } from "hono";
import { cors } from "hono/cors";
import { createClient } from "npm:@blinkdotnew/sdk";

const app = new Hono();
app.use("*", cors());

const getBlink = (env: Record<string, string>) =>
  createClient({
    projectId: env.BLINK_PROJECT_ID,
    secretKey: env.BLINK_SECRET_KEY,
  });

app.get("/health", (c) => c.json({ ok: true }));

app.post("/api/analyze", async (c) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);
  try {
    const { imageUrl, type } = await c.req.json() as { imageUrl: string; type: string };
    if (!imageUrl || !type) return c.json({ error: "imageUrl and type required" }, 400);

    const TYPE_LABELS: Record<string, string> = {
      stamp: "timbre postal",
      coin: "pièce de monnaie",
      banknote: "billet de banque",
      card: "carte de collection (sportive, Pokémon, etc.)",
      other: "objet de collection",
    };

    const blink = getBlink(c.env as Record<string, string>);
    const { object } = await blink.ai.generateObject({
      model: "google/gemini-3-flash",
      messages: [
        {
          role: "system",
          content: `Tu es un expert philatéliste, numismate et spécialiste des objets de collection avec 30 ans d'expérience. Tu analyses des photos et fournis des estimations PRÉCISES basées sur le marché réel (eBay, Delcampe, NGC, PCGS). Réponds toujours en français.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyse ce ${TYPE_LABELS[type] || "objet de collection"}. Identifie précisément : pays d'origine, période, état de conservation (observe les défauts), valeur marchande actuelle réaliste.`,
            },
            { type: "image", image: imageUrl },
          ],
        },
      ],
      schema: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["stamp", "coin", "banknote", "card", "other"] },
          name: { type: "string" },
          description: { type: "string" },
          estimatedValueMin: { type: "number" },
          estimatedValueMax: { type: "number" },
          currency: { type: "string" },
          confidenceScore: { type: "number" },
          historicalInfo: { type: "string" },
          originCountry: { type: "string" },
          originYear: { type: "string" },
          condition: { type: "string" },
          rarity: { type: "string", enum: ["Commun", "Peu commun", "Rare", "Très rare", "Exceptionnel"] },
          keyFacts: { type: "array", items: { type: "string" } },
        },
        required: ["type", "name", "description", "estimatedValueMin", "estimatedValueMax", "currency", "confidenceScore", "historicalInfo", "originCountry", "originYear", "condition", "rarity", "keyFacts"],
      },
    });

    return c.json({ success: true, result: object });
  } catch (err: any) {
    console.error("Analyze error:", err?.message);
    return c.json({ error: err?.message || "Analysis failed" }, 500);
  } finally {
    clearTimeout(timeout);
  }
});

app.post("/api/upload", async (c) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return c.json({ error: "file required" }, 400);

    const blink = getBlink(c.env as Record<string, string>);
    const ext = file.name.split(".").pop() || "jpg";
    const { publicUrl } = await blink.storage.upload(file, `collectscan/${Date.now()}.${ext}`);
    return c.json({ success: true, publicUrl });
  } catch (err: any) {
    console.error("Upload error:", err?.message);
    return c.json({ error: err?.message || "Upload failed" }, 500);
  } finally {
    clearTimeout(timeout);
  }
});

export default app;
