import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

export async function extractPainPoints(reviews: string[]): Promise<string[]> {
  if (!reviews || reviews.length === 0) {
    return [];
  }

  const reviewText = reviews.join("\n\n---\n\n");

  try {
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      system: `You are a B2B sales analyst. Your job is to read customer reviews for a business and identify specific "pain points" or problems that the business is facing, which a B2B service provider could potentially solve (e.g. bad website, slow service, poor marketing, staffing issues, etc). 
      Extract 1 to 4 distinct pain points. Output ONLY a raw JSON array of strings. Do NOT output markdown formatting like \`\`\`json. Keep each point under 10 words. If the reviews are overwhelmingly positive and you cannot find any real problems, return an empty array [].`,
      prompt: `Reviews:\n\n${reviewText}`,
    });

    try {
      // Clean up potential markdown formatting if the model disobeys
      let cleanText = text.trim();
      if (cleanText.startsWith("```json")) {
        cleanText = cleanText.replace(/```json/g, "").replace(/```/g, "").trim();
      }
      
      const parsed = JSON.parse(cleanText);
      if (Array.isArray(parsed)) {
        return parsed.slice(0, 4);
      }
      return [];
    } catch (parseError) {
      console.error("[extractPainPoints] Failed to parse JSON:", text);
      return [];
    }
  } catch (error) {
    console.error("[extractPainPoints] AI extraction failed:", error);
    return [];
  }
}
