import { LinkFormatError } from "./errors";
import { MAX_RECOMMENDED_PORTABLE_URL_CHARACTERS } from "./model";

export interface PortableDocumentUrls {
  readonly fullUrl: string;
  readonly partUrls: readonly string[];
}

export const PORTABLE_LINK_DISPLAY_MODES = [
  "divided",
  "complete",
  "all",
] as const;

export type PortableLinkDisplayMode =
  (typeof PORTABLE_LINK_DISPLAY_MODES)[number];

export function abbreviatePortableUrl(
  url: string,
  maximumLength: number,
): string {
  const ellipsis = "...";
  if (url.length <= maximumLength) {
    return url;
  }
  if (maximumLength <= ellipsis.length) {
    return ellipsis.slice(0, Math.max(0, maximumLength));
  }

  return `${url.slice(0, maximumLength - ellipsis.length)}${ellipsis}`;
}

export function isRecommendedPortableUrl(url: string): boolean {
  return url.length <= MAX_RECOMMENDED_PORTABLE_URL_CHARACTERS;
}

export function selectAiPromptUrls(
  links: PortableDocumentUrls,
  mode: PortableLinkDisplayMode = "divided",
): readonly string[] {
  const dividedUrls =
    links.partUrls.length > 0 ? links.partUrls : [links.fullUrl];
  if (!isRecommendedPortableUrl(links.fullUrl)) {
    return dividedUrls;
  }

  if (mode === "complete") {
    return [links.fullUrl];
  }
  if (mode === "all") {
    return [links.fullUrl, ...links.partUrls];
  }
  return dividedUrls;
}

export function createAiLearningPrompt(
  links: PortableDocumentUrls,
  mode: PortableLinkDisplayMode = "divided",
): string {
  const urls = selectAiPromptUrls(links, mode);
  if (urls.length === 0) {
    throw new LinkFormatError(
      "INVALID_URL",
      "At least one document URL is required to create an AI prompt.",
    );
  }

  return [
    "Learn this skill by opening every SkillsLink page URL below in order:",
    "",
    ...urls.map((url, index) => `${index + 1}. ${url}`),
    "",
    "At each link, read the rendered Markdown part completely. Join the parts in numbered order to reconstruct one complete skill. Learn all instructions and constraints from the combined content. Then briefly state the skill's purpose, when it should be used, and the rules you must follow. Wait for my task after that.",
  ].join("\n");
}
