import { grid, outline, px, type Grid } from "./core";

/**
 * 반려동물 도트 그림. 왼쪽 절반만 글자로 그리면 거울처럼 오른쪽이 채워지고(얼굴이 좌우 대칭),
 * 꼬리처럼 한쪽에만 있는 부분은 extra 로 덧그린다. 글자는 팔레트(pal)의 색이고 '.' 은 빈칸.
 */
function sprite(half: string[], pal: Record<string, string>, extra?: (put: (x: number, y: number, c: string) => void) => void, pad = 3, extraW = 0): Grid {
  const rows = half.map((r) => r + [...r].reverse().join(""));
  const g = grid(rows[0].length + pad * 2 + extraW, rows.length + pad * 2);
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) px(g, x + pad, y + pad, pal[ch]); }));
  extra?.((x, y, c) => px(g, x + pad, y + pad, c));
  return outline(g);
}

const INK = "#3a2a33";

export function petSprite(kind: string): Grid | null {
  if (kind === "baby") {
    // 기저귀 입은 아기: 큰 둥근 머리에 뾰족한 머리 한 가닥(분홍 방울), 점 눈, 발그레한 볼, 앉아서 두 손을 모은 모습
    return sprite([
      ".......r",
      "......ss",
      "....ssss",
      "..ssssss",
      ".sssssss",
      "ssssssss",
      "ssssssss",
      "ssskssss",
      "ssssssss",
      "spsssssm",
      ".sssssss",
      "..ssssss",
      "..sssdds",
      "..ssssss",
      ".wwwwwww",
      ".wwwgwwy",
      ".wwwwwww",
      "..ss....",
    ], { s: "#f6cba6", k: INK, p: "#f4a3a3", r: "#f06a7a", m: "#c0504d", d: "#e3a982", w: "#ffffff", g: "#d8dee9", y: "#f2c64e" });
  }
  return null;
}
