/**
 * Icon shortcode expansion.
 *
 * Shortcode format: :icon-set--icon-name:
 * The double-dash (--) maps to Iconify's colon separator (set:name).
 *
 * Examples:
 *   :devicon--java:         → <span class="iconify" data-icon="devicon:java"></span>
 *   :tabler--phone:         → <span class="iconify" data-icon="tabler:phone"></span>
 *   :vscode-icons--file-type-aws: → <span class="iconify" data-icon="vscode-icons:file-type-aws"></span>
 */

const SHORTCODE_PATTERN = /:([a-z0-9][a-z0-9-]*--[a-z0-9][a-z0-9-]*):/g;

/** Expand all icon shortcodes in a string to Iconify HTML spans. */
export function expandIcons(text: string): string {
  return text.replace(SHORTCODE_PATTERN, (_match, code: string) => {
    const icon = code.replace("--", ":");
    return `<span class="iconify" data-icon="${icon}"></span>`;
  });
}

/**
 * Convert an Iconify HTML span back to a shortcode.
 * Used for migrating existing data from HTML to shortcode format.
 */
const HTML_ICON_PATTERN = /<span\s+class="iconify"\s+data-icon="([^"]+)"\s*><\/span>/g;

export function htmlToShortcodes(text: string): string {
  return text.replace(HTML_ICON_PATTERN, (_match, icon: string) => {
    const code = icon.replace(":", "--");
    return `:${code}:`;
  });
}
