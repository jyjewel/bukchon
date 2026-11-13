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
  if (kind === "cat") {
    return sprite([
      "........",
      ".o......",
      ".oo.....",
      ".oeooooo",
      ".ooooooo",
      ".ooooodo",
      ".oohkooo",
      ".ookkooo",
      ".oooowwo",
      ".ooowwwp",
      ".ooowwwk",
      "..ooowww",
      "..ooowww",
      "..ooowww",
      "..oooooo",
      "..wwoooo",
    ], { o: "#f4b26a", d: "#d98a3f", w: "#fff4e0", k: INK, p: "#f29aa8", h: "#ffffff", e: "#fbd0d6" },
    (put) => { for (const [x, y] of [[16, 13], [17, 12], [17, 11], [16, 10], [15, 10]]) put(x, y, "#f4b26a"); put(16, 11, "#d98a3f"); put(17, 12, "#d98a3f"); });
  }
  if (kind === "dog") {
    return sprite([
      "........",
      ".dd.....",
      ".ddd....",
      ".dddoooo",
      ".ddooooo",
      ".ooooooo",
      ".oohkooo",
      ".ookkooo",
      ".ooowwww",
      ".ooowwww",
      ".oowwwwk",
      ".ooowwwp",
      "..ooowww",
      "..ooowww",
      "..oooooo",
      "..wwoooo",
    ], { o: "#f0c07c", d: "#d98a3f", w: "#fff6e6", k: INK, p: "#f2788a", h: "#ffffff" },
    (put) => { for (const [x, y] of [[16, 13], [17, 12], [18, 11], [18, 10], [17, 9]]) put(x, y, "#f0c07c"); put(17, 9, "#fff6e6"); });
  }
  if (kind === "hedwig") {
    return sprite([
      "........",
      "..wwwwww",
      ".wwwwwww",
      ".wwgwwww",
      ".wyyywww",
      ".wykywwb",
      ".wyyywwb",
      ".wwwwwww",
      ".wgwwgww",
      ".gwwwwgw",
      ".gwgwwwg",
      ".gwwwgww",
      "..gwwwww",
      "..wwwwww",
      "...bb...",
    ], { w: "#ffffff", g: "#c9ccd6", y: "#f2c230", k: INK, b: "#e0a45c" },
    (put) => { put(5, 5, "#fff3c4"); put(13, 5, "#fff3c4"); });
  }
  if (kind === "duo") {
    return sprite([
      "..gg....",
      ".ggggggg",
      "ggwwwwww",
      "gwwwwwww",
      "gwwkkwww",
      "gwwkkwww",
      "ggwwwwww",
      "gggggggo",
      "gggggggo",
      "dgggllll",
      "dgglllll",
      "dgglllll",
      ".gggllll",
      "..gg.lll",
      "..oo....",
    ], { g: "#58cc02", l: "#a8ee4a", d: "#3f9a00", w: "#ffffff", k: INK, o: "#ff9600" });
  }
  if (kind === "squirrel") {
    return sprite([
      "........",
      ".b......",
      ".bb.....",
      ".bbbbbbb",
      "bbbbbbbb",
      "bbhkbbbb",
      "bbkkbbbb",
      "bbbbbwww",
      ".bbbwwwp",
      ".bbbwwwk",
      "..bbbbbb",
      "..bbwwww",
      "..bbwwww",
      "..bbbbbb",
      "..dddbbb",
    ], { b: "#c98a4e", d: "#8a5a3a", w: "#fff1d6", k: INK, p: "#f29aa8", h: "#ffffff" },
    (put) => {
      // 크고 복슬한 꼬리(줄무늬): 등 뒤로 높이 말려 올라간다
      const rows: [number, number, number][] = [[17, 2, 2], [16, 3, 5], [16, 4, 5], [16, 5, 5], [16, 6, 5], [16, 7, 5], [16, 8, 5], [16, 9, 5], [16, 10, 4], [16, 11, 4], [16, 12, 3]];
      for (const [x0, y0, w] of rows) for (let i = 0; i < w; i++) put(x0 + i, y0, (y0 + i) % 3 === 0 ? "#8a5a3a" : i === w - 1 ? "#e8b87c" : "#d9a066");
    }, 3, 4);
  }
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
