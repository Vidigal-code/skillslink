import Image from "next/image";
import { styled } from "next-yak";

import { SITE_ICON_PATH, SITE_NAME } from "@/shared/config/site";

const Logo = styled(Image)`
  display: block;
  width: 100%;
  height: 100%;
`;

export interface SiteLogoProps {
  readonly decorative?: boolean;
  readonly preload?: boolean;
}

export function SiteLogo({
  decorative = false,
  preload = false,
}: SiteLogoProps) {
  return (
    <Logo
      src={SITE_ICON_PATH}
      alt={decorative ? "" : SITE_NAME}
      width={256}
      height={256}
      preload={preload}
      unoptimized
    />
  );
}
