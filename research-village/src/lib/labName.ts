/** 연구실 이름: 정해 둔 게 없으면 "{이름}의 연구실" */
export const labTitle = (p: { display_name: string; lab_name?: string | null }) => (p.lab_name?.trim() ? p.lab_name.trim() : `${p.display_name}의 연구실`);

/** 지도 간판에 쓸 두 줄: 짧으면 한 줄, 길면 가운데(공백이 있으면 공백)에서 나누고 한 줄이 6자를 넘으면 …로 줄인다 */
export function signLines(name: string): string[] {
  const n = name.trim();
  if ([...n].length <= 5) return [n];
  const chars = [...n], mid = Math.ceil(chars.length / 2);
  let cut = mid;
  for (let d = 0; d <= 3; d++) { if (chars[mid - d] === " ") { cut = mid - d; break; } if (chars[mid + d] === " ") { cut = mid + d; break; } }
  const fit = (t: string) => { const c = [...t.trim()]; return c.length > 6 ? c.slice(0, 5).join("") + "…" : c.join(""); };
  return [fit(chars.slice(0, cut).join("")), fit(chars.slice(cut).join(""))].filter(Boolean);
}
