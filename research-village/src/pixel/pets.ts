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
    return sprite([
      ".......t",
      "......tt",
      "..sssstt",
      ".sssssss",
      "ssssssss",
      "sskkssss",
      "sshkssss",
      "sppsssss",
      "sssssmmm",
      ".sssssss",
      ".ssssss.",
      "ssswwwww",
      "sswwwwww",
      "swwgwwww",
      ".wwwwwyw",
      ".ssswwww",
      ".ss.....",
    ], { s: "#f8d3b0", k: INK, h: "#ffffff", p: "#f4a3a3", t: "#5a3a22", m: "#c0504d", w: "#ffffff", g: "#d8dee9", y: "#f2c64e" });
  }
  return null;
}
