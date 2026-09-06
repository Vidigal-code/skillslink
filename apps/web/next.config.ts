import type { NextConfig } from "next";
import { withYak } from "next-yak/withYak";

const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  transpilePackages: ["@skillslink/link-format"],
};

export default withYak(
  {
    experiments: {
      transpilationMode: "Css",
    },
  },
  nextConfig,
);

function normalizeBasePath(value: string | undefined): string {
  if (value === undefined || value === "" || value === "/") {
    return "";
  }

  return `/${value.replace(/^\/+|\/+$/gu, "")}`;
}
