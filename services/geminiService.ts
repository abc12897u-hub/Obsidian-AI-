import { GoogleGenAI, Tool } from "@google/genai";
import { NewsSummary } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateDailyBriefing = async (): Promise<NewsSummary> => {
  const today = new Date().toLocaleDateString("zh-TW", {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });

  const prompt = `
    你是一位專業的金融分析師和新聞聚合專家。
    
    任務:
    1. 搜尋今天 (${today}) 最新的美股市場表現 (S&P 500, Nasdaq, Dow Jones)，漲跌幅較大的股票以及關鍵經濟指標。
    2. 搜尋影響全球市場的重大國際地緣政治新聞和頭條。
    3. 搜尋重要的科技產業更新與新聞。

    輸出要求:
    請生成一份適合 Obsidian 使用的 Markdown 格式綜合每日摘要，並使用**繁體中文**撰寫。
    
    結構:
    # 📅 每日簡報: ${today}
    
    ## 📉 市場概況
    (指數、債券收益率、加密貨幣摘要)
    
    ## 🇺🇸 美股焦點
    (漲跌幅排行榜、財報、板塊表現)
    
    ## 🌍 國際與地緣政治新聞
    (重大全球事件)
    
    ## 🤖 科技與創新
    (AI 新聞、重大發布)
    
    ## 💡 關鍵要點
    (3-5 個重點摘要)

    ---
    *由 Gemini 3.0 生成*
  `;

  try {
    const model = "gemini-3-pro-preview"; // Using Pro for better reasoning and search integration
    
    const tools: Tool[] = [
        { googleSearch: {} }
    ];

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: tools,
        responseMimeType: "text/plain",
      },
    });

    const text = response.text || "無法生成摘要。";
    
    // Extract sources if available (Gemini Search Grounding)
    const sources: Array<{ title: string; uri: string }> = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web) {
          sources.push({ title: chunk.web.title, uri: chunk.web.uri });
        }
      });
    }

    return {
      date: new Date().toISOString().split('T')[0],
      content: text,
      sources: sources
    };

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw new Error("無法生成每日簡報，請稍後再試。");
  }
};