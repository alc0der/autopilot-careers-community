import { fileLogger } from "../src/loggers";

describe("file logger", () => {
  const logger = fileLogger("test");
  it("should create new file", () => {
    logger.info("Processed HTML", { content: "<html></html>" });
  });
  it("should debug new file", () => {
    logger.debug("Processed HTML", { content: "<html></html>" });
  });
});
