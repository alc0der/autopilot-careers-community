import { confirm } from "@clack/prompts";
import { Command, OptionValues } from "commander";
import { logger } from "./loggers";

export function processOptions(opts: OptionValues): {
  url: URL;
  id: string;
} {
  const options = opts as ReturnType<
    () => {
      id: string;
      url: string;
    }
  >;
  logger.debug(`values are: ${opts}`);
  return {
    url: new URL(
      options.url ?? `https://www.linkedin.com/jobs/view/${options.id}`,
    ),
    id: options.id ?? options.url.split("/").pop(),
  };
}

export async function promptLogin() {
  console.log("Please log in to LinkedIn.");
  console.log("Waiting for user to confirm login...");
  return await confirm({
    message: "Press Enter once you have logged in.",
  });
}
