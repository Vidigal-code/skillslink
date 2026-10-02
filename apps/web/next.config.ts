import { normalizeBasePath } from "@skillslink/link-format";
import type { NextConfig } from "next";
import { withYak } from "next-yak/withYak";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH),
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
