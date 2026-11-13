import type { NextConfig } from "next";

// 서버 코드가 없는 정적 앱이다. `npm run build` 결과물(out/)을 Vercel·Netlify·GitHub Pages 어디에나 올릴 수 있다.
// 하위 경로(예: /research-village)에 배포할 때는 NEXT_PUBLIC_BASE_PATH 를 지정한다.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
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
