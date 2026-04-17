import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TYPE_LABELS: Record<string, string> = {
  stamp: "timbre postal",
  coin: "pièce de monnaie",
  banknote: "billet de banque",
  card: "carte de collection (sportive, Pokémon, etc.)",
  other: "objet de collection",
};

const SYSTEM_PROMPT = `Tu es un expert philatéliste et numismate de renommée mondiale avec 40 ans d'expérience.
Tu as expertisé des collections pour Christie's, Sotheby's, Heritage Auctions.
Tu utilises les catalogues Stanley Gibbons, Scott, Yvert & Tellier (philatélie)
et NGC, PCGS, Krause World Coins (numismatique).

RÈGLES ABSOLUES :
- Réponds UNIQUEMENT en JSON valide, JAMAIS de texte avant ou après
- Valeurs marchées basées sur l'ÉTAT VISIBLE (pas sur la cote catalogue)
- Sois précis sur la variété, le millésime, la valeur faciale
- Historique riche et factuel en 5-7 phrases minimum
- Points clés : au moins 5 faits précis et uniques à cet objet`;

function buildUserPrompt(type: string, typeLabel: string): string {
  return `Examine attentivement cette photo de ${typeLabel}. Analyse l'état visible (centrage, gomme, oblitération, défauts), identifie le pays, l'émission exacte, la variété si visible, et estime la valeur marché réelle en 2026.

Réponds UNIQUEMENT avec ce JSON (sans markdown, sans backticks) :
{
  "type": "${type}",
  "name": "nom officiel complet et précis (ex: France 1849 Cérès 20c bleu Type I)",
  "description": "description experte détaillée de l'apparence et de l'état en 3-5 phrases",
  "estimatedValueMin": 1.50,
  "estimatedValueMax": 8.00,
  "currency": "EUR",
  "confidenceScore": 0.92,
  "historicalInfo": "contexte historique très riche : émission, contexte politique, anecdotes, usage postal, tirage... en 5-7 phrases",
  "originCountry": "France",
  "originYear": "1849",
  "condition": "TTB",
  "rarity": "Peu commun",
  "catalogueRef": "Yvert n°3 / Scott #3",
  "keyFacts": ["Fait précis 1", "Fait précis 2", "Fait précis 3", "Fait précis 4", "Fait précis 5"],
  "marketplaces": "eBay: 2-6€, Delcampe: 3-8€"
}`;
}

/**
 * Télécharge une image depuis une URL et la convertit en base64.
 * Gère aussi les data: URIs (extraction directe sans téléchargement).
 */
async function fetchImageAsBase64(
  imageUrl: string
): Promise<{ base64: string; mediaType: string }> {
  // data: URI — extraction directe
  if (imageUrl.startsWith("data:")) {
    const comma = imageUrl.indexOf(",");
    if (comma === -1) throw new Error("INVALID_DATA_URI");
    const header = imageUrl.slice(5, comma);
    const base64 = imageUrl.slice(comma + 1);
    const mediaType = header.replace(";base64", "") || "image/jpeg";
    return { base64, mediaType };
  }

  // URL HTTP(S)
  const res = await fetch(imageUrl, {
    headers: { "User-Agent": "StampScan/2.0" },
  });
  if (!res.ok) throw new Error(`IMAGE_FETCH_${res.status}`);

  const contentType = (res.headers.get("content-type") || "image/jpeg")
    .split(";")[0]
    .trim();
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Conversion en base64 par chunks pour éviter les limites du spread operator
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
  }
  const base64 = btoa(binary);

  return { base64, mediaType: contentType };
}

serve(async (req) => {
  // Pré-vol CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { imageUrl, type } = await req.json();

    if (!imageUrl || !type) {
      return new Response(
        JSON.stringify({ error: "imageUrl and type are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Clé API Claude stockée dans les Secrets du projet Supabase
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({
          error:
            "ANTHROPIC_API_KEY non configurée. Ajoutez-la dans Dashboard > Edge Functions > Secrets.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const typeLabel = TYPE_LABELS[type] || "objet de collection";

    // Télécharger l'image en base64 pour l'envoyer à Claude
    let imageSource: Record<string, unknown>;
    try {
      const { base64, mediaType } = await fetchImageAsBase64(imageUrl);
      imageSource = { type: "base64", media_type: mediaType, data: base64 };
    } catch {
      // Fallback : envoyer l'URL directement
      imageSource = { type: "url", url: imageUrl };
    }

    // Appel à l'API Claude
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 3000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: imageSource },
              { type: "text", text: buildUserPrompt(type, typeLabel) },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 401) throw new Error("API_KEY_INVALID");
      if (response.status === 429) throw new Error("AI_QUOTA_EXCEEDED");
      throw new Error(
        `CLAUDE_API_ERROR_${response.status}: ${errText.slice(0, 200)}`
      );
    }

    const data = await response.json();
    const rawText =
      data?.content?.find((b: { type: string }) => b.type === "text")?.text ||
      "";

    // Nettoyage du JSON (Claude ajoute parfois des backticks)
    let cleaned = rawText
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "");

    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd <= jsonStart) {
      throw new Error("AI_INVALID_JSON");
    }
    cleaned = cleaned.slice(jsonStart, jsonEnd + 1);

    const result = JSON.parse(cleaned);

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("AI_QUOTA_EXCEEDED") ? 429 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
