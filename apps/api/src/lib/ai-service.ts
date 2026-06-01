/** Anthropic Claude — abstracted behind AIService (PDF). */
export interface AIService {
  summarizeReport(text: string): Promise<string>;
  suggestSubstitute(context: {
    className: string;
    absentTeacher: string;
    availableTeachers: string[];
  }): Promise<string>;
}

export class ClaudeAIService implements AIService {
  constructor(private readonly apiKey: string) {}

  async summarizeReport(text: string): Promise<string> {
    if (!this.apiKey) {
      return "AI özeti kullanılamıyor (ANTHROPIC_API_KEY eksik).";
    }
    // Wire @anthropic-ai/sdk when key is configured in production.
    return `Özet (stub): ${text.slice(0, 120)}…`;
  }

  async suggestSubstitute(context: {
    className: string;
    absentTeacher: string;
    availableTeachers: string[];
  }): Promise<string> {
    if (!this.apiKey) {
      return context.availableTeachers[0] ?? "Öğretmen atanmadı";
    }
    return context.availableTeachers[0] ?? "Öğretmen atanmadı";
  }
}

export function createAIService(): AIService {
  return new ClaudeAIService(process.env.ANTHROPIC_API_KEY ?? "");
}
