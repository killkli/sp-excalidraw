import type { DataURL } from "../types";
import type { OpenAIInput, OpenAIOutput } from "./ai/types";

export type MagicCacheData =
  | {
      status: "pending";
    }
  | { status: "done"; html: string }
  | {
      status: "error";
      message?: string;
      code: "ERR_GENERATION_INTERRUPTED" | string;
    };

const SYSTEM_PROMPT = `你是一個專業的家庭教師，認真解答學生在學習上的各種問題，對於複雜的問題，你會逐步分解問題後，替學生解釋說明，以確保學生能夠順利吸收理解。
以下是你必須遵守的規範:
- 英文問題：提供詳細解釋，包括語法、詞彙使用、句子結構等。
- 數學問題：逐步解答題目，包括每一步驟的詳細說明，並提供最終答案。
- 給出進一步的學習建議和資源推薦。
- 必須使用台灣習慣的繁體中文回答問題（除了英文教學可使用英文外）
- 若有使用到數學式，請用$符號包裹inline的LaTex式子，$$包裹獨立段落的LaTex式子
`;
const SYSTEM_PROMPT_WIRE = `You are a skilled front-end developer who builds interactive prototypes from wireframes, and is an expert at CSS Grid and Flex design.
Your role is to transform low-fidelity wireframes into working front-end HTML code.

YOU MUST FOLLOW FOLLOWING RULES:

- Use HTML, CSS, JavaScript to build a responsive, accessible, polished prototype
- Leverage Tailwind for styling and layout (import as script <script src="https://cdn.tailwindcss.com"></script>)
- Inline JavaScript when needed
- Fetch dependencies from CDNs when needed (using unpkg or skypack)
- Source images from Unsplash or create applicable placeholders
- Interpret annotations as intended vs literal UI
- Fill gaps using your expertise in UX and business logic
- Try to make the UI as responsive as possible, for both desktop and mobile
- Use grid and flexbox wherever applicable.
- Convert the wireframe in its entirety, don't omit elements if possible.

If the wireframes, diagrams, or text is unclear or unreadable, refer to provided text for clarification.

Your goal is a production-ready prototype that brings the wireframes to life.

Please output JUST THE HTML file containing your best attempt at implementing the provided wireframes.`;

export async function askAI({
  image,
  apiKey,
  text,
  apiEndpoint = "https://openrouter.ai/api/v1/chat/completions",
  model = "openai/gpt-4o",
  mode = "tutor",
}: {
  image: DataURL;
  apiKey: string;
  text: string;
  apiEndpoint?: string;
  model?: string;
  mode?: "tutor" | "maker";
}) {
  const body: OpenAIInput.ChatCompletionCreateParamsBase = {
    model,
    // model: "anthropic/claude-3-haiku",
    // 4096 are max output tokens allowed for `gpt-4-vision-preview` currently
    max_tokens: 4096,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content: mode === "tutor" ? SYSTEM_PROMPT : SYSTEM_PROMPT_WIRE,
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: image,
              detail: "high",
            },
          },
          {
            type: "text",
            text:
              mode === "tutor"
                ? `以上是學生學習的問題，請你給予詳細的指導，感謝！`
                : `Above is the reference wireframe. Please make a new website based on these and return just the HTML file. hat follows are the wireframe's text annotations (if any)...`,
          },
        ],
      },
    ],
  };

  let result:
    | ({ ok: true } & OpenAIOutput.ChatCompletion)
    | ({ ok: false } & OpenAIOutput.APIError);

  const resp = await fetch(apiEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (resp.ok) {
    const json: OpenAIOutput.ChatCompletion = await resp.json();
    result = { ...json, ok: true };
  } else {
    const json: OpenAIOutput.APIError = await resp.json();
    result = { ...json, ok: false };
  }

  return result;
}
