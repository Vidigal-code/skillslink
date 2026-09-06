"use client";

import { useSyncExternalStore } from "react";

import { PUBLIC_BASE_PATH, SITE_URL } from "../config/site";

const LOCAL_HOST_NAMES = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export interface RuntimeLocation {
  readonly hostname: string;
  readonly origin: string;
}

export interface ResolveRuntimeUrlInput {
  readonly configuredUrl: string;
  readonly location: RuntimeLocation;
  readonly publicBasePath?: string;
}

export function resolveRuntimeUrl({
  configuredUrl,
  location,
  publicBasePath = PUBLIC_BASE_PATH,
}: ResolveRuntimeUrlInput): string {
  if (!isLocalHostName(location.hostname)) {
    return configuredUrl;
  }

  const configured = new URL(configuredUrl);
  const deployedSite = new URL(SITE_URL);
  const relativePath = configured.pathname.startsWith(deployedSite.pathname)
    ? configured.pathname.slice(deployedSite.pathname.length)
    : configured.pathname.replace(/^\/+/, "");
  const normalizedBasePath = normalizeBasePath(publicBasePath);
  const localSite = new URL(`${normalizedBasePath}/`, `${location.origin}/`);

  return new URL(
    `${relativePath}${configured.search}${configured.hash}`,
    localSite,
  ).toString();
}

export function useRuntimeUrl(configuredUrl: string): string {
  return useSyncExternalStore(
    subscribeToStableLocation,
    () => resolveRuntimeUrl({ configuredUrl, location: window.location }),
    () => configuredUrl,
  );
}

function isLocalHostName(hostname: string): boolean {
  return LOCAL_HOST_NAMES.has(hostname) || hostname.endsWith(".localhost");
}

function normalizeBasePath(value: string): string {
  if (value === "" || value === "/") {
    return "";
  }

  return `/${value.replace(/^\/+|\/+$/gu, "")}`;
}

function subscribeToStableLocation(): () => void {
  return () => undefined;
}
