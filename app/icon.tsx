import { ImageResponse } from "next/og";
import { IconTile } from "@/lib/kiban/brand";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<IconTile size={32} />, size);
}
