import type { NextConfig } from "next";
import { mkdirSync, writeFileSync } from "node:fs";

// 서버 코드가 없는 정적 앱이다. `npm run build` 결과물(out/)을 Vercel·Netlify·GitHub Pages 어디에나 올릴 수 있다.
// 하위 경로(예: /research-village)에 배포할 때는 NEXT_PUBLIC_BASE_PATH 를 지정한다.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

// 배포마다 달라지는 번호. 화면 코드에 박아 두고 public/version.json 에도 적어, 앱을 켜 둔 사람에게 "새 버전이 나왔어요"를 알려 준다.
const buildId = process.env.GITHUB_SHA ?? String(Date.now());
try { mkdirSync("public", { recursive: true }); writeFileSync("public/version.json", JSON.stringify({ id: buildId })); } catch { /* 쓰지 못해도 앱은 돌아간다 */ }

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_ID: buildId },
  output: "export",
  basePath,
  images: { unoptimized: true },
  devIndicators: false, // 개발 중에만 보이는 동그란 표시가 화면 아래 메뉴를 가리지 않게
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
