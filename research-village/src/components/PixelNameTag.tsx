"use client";
import { useEffect, useRef } from "react";

const TW = 64, TH = 26;
/** 역할별 명찰 판 색: 참석자 흰색 · 토론자 은색 · 발표자 금색 · 게시자 자주색 */
const PLATE: Record<string, { base: string; hi: string; sh: string; ink: string }> = {
  attendee: { base: "#f7f8fb", hi: "#ffffff", sh: "#cfd3dc", ink: "#3a2a33" },
  discussant: { base: "#c4cad6", hi: "#eef1f6", sh: "#98a0b0", ink: "#2b2f3a" },
  presenter: { base: "#f2c744", hi: "#fff0a8", sh: "#d09a22", ink: "#4a3205" },
  host: { base: "#a86fd6", hi: "#d8b4f5", sh: "#7a42a8", ink: "#ffffff" },
};
const OUT = "#3a2a33";

/** 도트 그림 명찰: 네모난 플라스틱 판 가운데에 닉네임만 적힌다 */
export default function PixelNameTag({ name, role, label, scale = 2 }: { name: string; role: string; label: string; scale?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const p = PLATE[role] ?? PLATE.attendee;
    const draw = () => {
      ctx.clearRect(0, 0, TW, TH);
      ctx.imageSmoothingEnabled = false;
      const rect = (x: number, y: number, w: number, h: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
      // 판: 모서리를 한 칸 깎은 네모, 윤곽선 → 바탕 → 위쪽 빛 → 아래쪽 그늘
      rect(1, 0, TW - 2, TH, OUT); rect(0, 1, TW, TH - 2, OUT);
      rect(1, 1, TW - 2, TH - 2, p.base);
      rect(2, 1, TW - 4, 2, p.hi); rect(1, 2, 1, TH - 6, p.hi);
      rect(2, TH - 3, TW - 4, 2, p.sh); rect(TW - 2, 3, 1, TH - 6, p.sh);
      // 목걸이 줄을 거는 구멍
      rect(TW / 2 - 5, 3, 10, 3, OUT); rect(TW / 2 - 4, 4, 8, 1, p.sh);
      // 닉네임(도트 글꼴, 길면 작게). 글자 가장자리가 번지지 않게 한 점씩 또렷하게 찍는다
      const tmp = document.createElement("canvas");
      tmp.width = TW; tmp.height = TH;
      const t = tmp.getContext("2d");
      if (!t) return;
      t.textAlign = "center"; t.textBaseline = "middle"; t.fillStyle = "#000";
      t.font = "11px Galmuri11";
      if (t.measureText(name).width > TW - 8) t.font = "9px Galmuri9";
      let text = name;
      while (text.length > 1 && t.measureText(text).width > TW - 8) text = text.slice(0, -1);
      t.fillText(text === name ? text : text.slice(0, -1) + "…", TW / 2, 16);
      const img = t.getImageData(0, 0, TW, TH).data;
      ctx.fillStyle = p.ink;
      for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) if (img[(y * TW + x) * 4 + 3] > 110) ctx.fillRect(x, y, 1, 1);
    };
    draw();
    // 글꼴이 늦게 도착해도 다시 그린다
    let alive = true;
    void Promise.all([document.fonts.load("11px Galmuri11"), document.fonts.load("9px Galmuri9")]).then(() => { if (alive) draw(); });
    return () => { alive = false; };
  }, [name, role]);
  return <canvas ref={ref} width={TW} height={TH} role="img" aria-label={label} className="pixelated" style={{ width: TW * scale, height: TH * scale }} />;
}
