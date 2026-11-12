import { ImageResponse } from "next/og";
import { Mark } from "@/components/Mark";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ size: "192" }, { size: "512" }, { size: "maskable-512" }];
}

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const maskable = size.startsWith("maskable");
  const px = maskable ? 512 : Number(size) || 512;
  return new ImageResponse(<Mark px={px} maskable={maskable} />, { width: px, height: px });
}
