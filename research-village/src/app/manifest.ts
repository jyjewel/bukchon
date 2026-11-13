import type { MetadataRoute } from "next";

export const dynamic = "force-static";

// 홈 화면에 추가하면 앱처럼 열린다. 아이콘 경로는 하위 경로 배포(basePath)를 직접 붙여 준다.
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "연구자 마을",
    short_name: "연구자 마을",
    description: "함께 살아가는 작은 디지털 연구 마을",
    start_url: `${base}/`,
    scope: `${base}/`,
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbf5ef",
    theme_color: "#f8f4e8",
    lang: "ko",
    icons: [
      { src: `${base}/icons/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${base}/icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${base}/icons/maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
