import { BOARD, DESK_POS, H, HOUSE_POS, LIBRARY, LIB_H, LIB_W, PLAZA, POND, TREES, W } from "@/pixel/village";
import { ORB_POS } from "@/pixel/orb";

type Box = [number, number, number, number];   // x, y, 너비, 높이
/** 못 걷는 곳(집·도서관·게시판·책상·나무 밑동·구슬·광장 한가운데·연못) */
const BOXES: Box[] = [
  ...HOUSE_POS.map((p): Box => [p.x - 27, p.y - 62, 54, 64]),
  [LIBRARY.x - LIB_W / 2, LIBRARY.y - LIB_H + 6, LIB_W, LIB_H - 8],
  [BOARD.x - 14, BOARD.y - 30, 28, 32],
  ...DESK_POS.map((p): Box => [p.x - 14, p.y - 14, 28, 15]),
  ...TREES.map(([x, y]): Box => [x - 8, y - 10, 16, 12]),
  [ORB_POS.x - 9, ORB_POS.y - 12, 18, 14],
];

function free(x: number, y: number): boolean {
  if (x < 8 || x > W - 8 || y < 26 || y > H - 4) return false;
  if (Math.hypot(x - PLAZA.x, (y - (PLAZA.y + 6)) * 1.3) < 16) return false;                      // 광장 한가운데(분수·트리)
  if (((x - POND.x) / (POND.rx + 3)) ** 2 + ((y - POND.y) / (POND.ry + 3)) ** 2 < 1) return false;    // 연못
  return !BOXES.some(([bx, by, bw, bh]) => x >= bx && x <= bx + bw && y >= by && y <= by + bh);
}

/** 누른 곳이 걸을 수 있는 땅이면 그대로, 아니면 가장 가까운 걸을 수 있는 곳을 돌려준다(없으면 null) */
export function nearestWalkable(x: number, y: number): { x: number; y: number } | null {
  const px = Math.round(x), py = Math.round(y);
  if (free(px, py)) return { x: px, y: py };
  for (let r = 4; r <= 44; r += 4) {
    for (let a = 0; a < 16; a++) {
      const nx = Math.round(px + Math.cos((a / 16) * Math.PI * 2) * r), ny = Math.round(py + Math.sin((a / 16) * Math.PI * 2) * r);
      if (free(nx, ny)) return { x: nx, y: ny };
    }
  }
  return null;
}
