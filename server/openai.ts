let _openai: any = null;

async function getClient() {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!apiKey) return null;
  if (!_openai) {
    const { default: OpenAI } = await import("openai");
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

export interface RewriteResult {
  title: string;
  content: string;
  excerpt: string;
  inputTokens: number;
  outputTokens: number;
}

export async function rewriteArticle(
  title: string,
  content: string,
  category: string
): Promise<RewriteResult> {
  const fallback: RewriteResult = {
    title,
    content,
    excerpt: content.slice(0, 200) + (content.length > 200 ? "..." : ""),
    inputTokens: 0,
    outputTokens: 0,
  };

  const client = await getClient();
  if (!client) return fallback;

  try {
    const prompt = `You are a Nigerian news editor at AA+News. Rewrite this article to be more engaging for a Nigerian audience. Use Nigerian English naturally. Keep it factual and journalistic.

Category: ${category}
Original Title: ${title}
Original Content: ${content.slice(0, 1500)}

Respond ONLY with valid JSON:
{
  "title": "Punchy Nigerian-style headline (max 15 words)",
  "excerpt": "2-sentence summary (max 200 chars)",
  "content": "Full rewritten article (3-4 paragraphs, ~300 words)"
}`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 600,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    const usage = response.usage ?? { prompt_tokens: 0, completion_tokens: 0 };

    return {
      title: result.title || title,
      content: result.content || content,
      excerpt: result.excerpt || fallback.excerpt,
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
    };
  } catch {
    return fallback;
  }
}

export function estimateCostUsd(inputTokens: number, outputTokens: number): string {
  const cost = (inputTokens / 1_000_000) * 0.15 + (outputTokens / 1_000_000) * 0.60;
  return cost.toFixed(6);
}
