import { fromRows, type Grid } from "./core";

/** 던지는 물건(논문·각주 폭탄·빨간 펜·알람)과 맞았을 때 튀는 별 */
const SPRITES: Record<string, { rows: string[]; pal: Record<string, string> }> = {
  thesis: {
    rows: [".kkkkkkkkk.", "knnnnnnnnnk", "knggggggnwk", "knnnnnnnnwk", "knggggnnnwk", "knnnnnnnnwk", "kddddddddwk", ".kkkkkkkkk."],
    pal: { k: "#2a2433", n: "#2c4f92", d: "#1f3a6e", g: "#e8c24a", w: "#f6f2ea" },
  },
  footnote: {
    rows: ["....yoy...", ".....k....", "..kkkkkk..", ".kbbbbbbk.", "kbbwbbbbbk", "kbbbbbbbbk", "kbbbbbbbbk", ".kbbbbbbk.", "..kkkkkk.."],
    pal: { k: "#2a2433", b: "#4a4a58", w: "#e8e8f0", y: "#ffd23f", o: "#ff7a2f" },
  },
  redpen: {
    rows: ["kkkkkkkkkk.", "krrrrrrrrrk", "krrhrrrrrdk", "kkkkkkkkkk."],
    pal: { k: "#2a2433", r: "#e0302a", h: "#ff8a80", d: "#8e1520" },
  },
  alarm: {
    rows: ["kk......kk", "kyk.kk.kyk", ".kkkrrkkk.", ".krrrrrrk.", "krrwwwwrrk", "krrwkkwrrk", "krrwwkwrrk", ".krrrrrrk.", "..kk..kk.."],
    pal: { k: "#2a2433", r: "#e0302a", w: "#fff8e4", y: "#ffd23f" },
  },
  star: {
    rows: ["..y..", ".yyy.", "yyyyy", ".yyy.", "..y.."],
    pal: { y: "#ffe34a" },
  },
};

export function fxGrid(kind: string): Grid | null {
  const s = SPRITES[kind];
  return s ? fromRows(s.rows, s.pal) : null;
}
