import { Ollama } from "ollama";

const MODEL = "nomic-embed-text";

export class OllamaUnavailableError extends Error {
  constructor(cause: unknown) {
    super(
      `Ollama is not reachable at http://localhost:11434.\n` +
        `Required model: ${MODEL}\n` +
        `Original error: ${cause}`
    );
    this.name = "OllamaUnavailableError";
  }
}

let client: Ollama | null = null;

function getClient(): Ollama {
  if (!client) {
    client = new Ollama();
  }
  return client;
}

async function embed(
  input: string | string[]
): Promise<number[][]> {
  const ollama = getClient();
  try {
    const response = await ollama.embed({ model: MODEL, input });
    return response.embeddings;
  } catch (err) {
    throw new OllamaUnavailableError(err);
  }
}

export async function getEmbedding(text: string): Promise<number[]> {
  const embeddings = await embed(text);
  return embeddings[0];
}

export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  return embed(texts);
}

export function ollamaErrorResponse(err: unknown) {
  if (err instanceof OllamaUnavailableError) {
    return {
      content: [{ type: "text" as const, text: err.message }],
      isError: true,
    };
  }
  return null;
}
