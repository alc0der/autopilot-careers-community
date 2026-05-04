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
