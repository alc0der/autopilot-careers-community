import {
  fetchHtml,
  correctHtml,
  convertHtmlToMarkdown,
  fetchLinkedInJob,
  extractJobId,
  getLinkedInJobMarkdown,
  createJobFetcher,
  processLinkedInJob,
} from "../src/linkedin-functional";
import { ok, err, ResultAsync } from "neverthrow";

describe("LinkedIn Functional Pipeline", () => {
  const testJobId = "4277851038";

  describe("fetchHtml", () => {
    test("fetches partial HTML from LinkedIn API", async () => {
      const result = await fetchHtml(testJobId);
      result.match(
        (html) => {
          // Check structure instead of exact snapshot due to dynamic content
          expect(html).toContain("<div");
          expect(html).toContain("class=");
          expect(html.length).toBeGreaterThan(1000);
        },
        (error) => fail(`Unexpected error: ${error.message}`),
      );
    });
  });

  describe("correctHtml", () => {
    test("wraps partial HTML in complete document", () => {
      const partialHtml = '<div class="job-description">Test Job</div>';
      const result = correctHtml(partialHtml);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toMatchSnapshot("corrected-html");
      }
    });
  });

  describe("convertHtmlToMarkdown", () => {
    test("converts HTML to Markdown", () => {
      const html = `
        <html>
          <body>
            <h1>Title</h1>
            <p><strong>Bold text</strong> and <em>italic</em></p>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
          </body>
        </html>
      `;
      const result = convertHtmlToMarkdown(html);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toMatchSnapshot("html-to-markdown");
      }
    });
  });

  describe("fetchLinkedInJob (composed pipeline)", () => {
    test("complete pipeline from ID to Markdown", async () => {
      const result = await fetchLinkedInJob(testJobId);
      result.match(
        (markdown) => expect(markdown).toMatchSnapshot("complete-pipeline"),
        (error) => fail(`Pipeline failed: ${error.message}`),
      );
    });
  });

  describe("extractJobId", () => {
    test.each([
      ["4277851038", "4277851038"],
      ["https://www.linkedin.com/jobs/view/4277851038", "4277851038"],
      ["https://www.linkedin.com/jobs/view/4277851038/", "4277851038"],
      ["https://www.linkedin.com/jobs/view/4277851038?refId=xyz", "4277851038"],
    ])("extracts job ID from string %s", (input, expected) => {
      const result = extractJobId(input);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(expected);
      }
    });

    test("extracts job ID from URL object", () => {
      const url = new URL(
        "https://www.linkedin.com/jobs/view/4277851038?tracking=123",
      );
      const result = extractJobId(url);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe("4277851038");
      }
    });

    test("returns error for invalid input", () => {
      const result = extractJobId("not-a-valid-id");
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain("Could not extract job ID");
      }
    });
  });

  describe("createJobFetcher (curried composition)", () => {
    test("allows custom pipeline components", async () => {
      const mockFetch = jest
        .fn()
        .mockImplementation(() =>
          ResultAsync.fromSafePromise(
            Promise.resolve(ok("<div>Mock HTML</div>")),
          ),
        );
      const mockCorrect = jest
        .fn()
        .mockReturnValue(ok("<html><body>Mock</body></html>"));
      const mockConvert = jest.fn().mockReturnValue(ok("# Mock Markdown"));

      const customFetcher =
        createJobFetcher(mockFetch)(mockCorrect)(mockConvert);
      const result = await customFetcher("123");

      result.match(
        (markdown) =>
          expect(markdown).toMatchSnapshot("custom-pipeline-result"),
        (error) => fail(`Custom pipeline failed: ${error.message}`),
      );

      expect(mockFetch).toHaveBeenCalledWith("123");
      expect(mockCorrect).toHaveBeenCalled();
      expect(mockConvert).toHaveBeenCalled();
    });
  });

  describe("getLinkedInJobMarkdown (main entry)", () => {
    test("handles URL string input", async () => {
      const result = await getLinkedInJobMarkdown(
        "https://www.linkedin.com/jobs/view/4277851038",
      );
      result.match(
        (markdown) =>
          expect(markdown).toMatchSnapshot("main-entry-with-url-string"),
        (error) => fail(`Failed with URL string: ${error.message}`),
      );
    });

    test("handles URL object input", async () => {
      const url = new URL("https://www.linkedin.com/jobs/view/4277851038");
      const result = await getLinkedInJobMarkdown(url);
      result.match(
        (markdown) =>
          expect(markdown).toMatchSnapshot("main-entry-with-url-object"),
        (error) => fail(`Failed with URL object: ${error.message}`),
      );
    });

    test("handles ID input", async () => {
      const result = await getLinkedInJobMarkdown("4277851038");
      result.match(
        (markdown) => expect(markdown).toMatchSnapshot("main-entry-with-id"),
        (error) => fail(`Failed with ID: ${error.message}`),
      );
    });
  });

  describe("processLinkedInJob (backward compatibility)", () => {
    test("works with JobId type", async () => {
      const markdown = await processLinkedInJob("4277851038");
      expect(markdown).toMatchSnapshot("process-with-job-id");
    });

    test("works with URL object", async () => {
      const url = new URL("https://www.linkedin.com/jobs/view/4277851038");
      const markdown = await processLinkedInJob(url);
      expect(markdown).toMatchSnapshot("process-with-url");
    });

    test("works with URL string", async () => {
      const markdown = await processLinkedInJob(
        "https://www.linkedin.com/jobs/view/4277851038",
      );
      expect(markdown).toMatchSnapshot("process-with-url-string");
    });

    test("throws error on failure", async () => {
      await expect(processLinkedInJob("invalid-input")).rejects.toThrow(
        "Could not extract job ID",
      );
    });
  });
});
