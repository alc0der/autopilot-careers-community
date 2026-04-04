import { processOptions } from "../src/app_cli";

describe("cli_app", () => {
  it("should resolve id", () => {
    const url = `https://www.linkedin.com/jobs/view/123`;

    const { id, url: resolvedUrl } = processOptions({ url });

    expect(id).toEqual("123");
    expect(resolvedUrl).toEqual(
      new URL("https://www.linkedin.com/jobs/view/123"),
    );
  });
});
