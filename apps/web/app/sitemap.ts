import type { MetadataRoute } from "next";

import { getAllDocumentSnapshots } from "@/entities/shared-document/index.server";
import {
  createAbsolutePageUrl,
  createCanonicalDocumentUrl,
} from "@/shared/config/site";
import { LANGUAGE_CODES } from "@/shared/i18n";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const snapshots = await getAllDocumentSnapshots();
  const staticRoutes = ["", "about", "upload"] as const;
  return [
    ...staticRoutes.map((route) => ({
      url: createAbsolutePageUrl(route),
      changeFrequency: "weekly" as const,
      priority: route === "" ? 1 : 0.7,
    })),
    ...LANGUAGE_CODES.flatMap((language) =>
      staticRoutes.map((route) => ({
        url: createAbsolutePageUrl(route, language),
        changeFrequency: "weekly" as const,
        priority: route === "" ? 0.9 : 0.7,
      })),
    ),
    ...snapshots.map((snapshot) => ({
      url: createCanonicalDocumentUrl(snapshot.id),
      lastModified: snapshot.publishedAt,
      changeFrequency: "never" as const,
      priority: 0.8,
    })),
    ...LANGUAGE_CODES.flatMap((language) =>
      snapshots.map((snapshot) => ({
        url: createCanonicalDocumentUrl(snapshot.id, language),
        lastModified: snapshot.publishedAt,
        changeFrequency: "never" as const,
        priority: 0.7,
      })),
    ),
  ];
}
