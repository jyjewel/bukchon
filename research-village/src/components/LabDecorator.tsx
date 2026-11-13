"use client";
import { useState } from "react";
import { errorMessage, supabase } from "@/lib/supabase";
import {
  LAB_ACCENTS, LAB_DESK_ITEMS, LAB_DESKS, LAB_EXTRAS, LAB_FLOORS, LAB_PATTERNS, LAB_PETS, LAB_RUGS, LAB_VIEWS, LAB_WALLS, normalizeLabStyle,
} from "@/lib/labStyle";
import type { LabStyle, Resident } from "@/lib/types";
import RoomCanvas from "./RoomCanvas";
import { Choices, Notice, Swatches, Toggles } from "./ui";

/** 연구실 안쪽 꾸미기: 고르는 즉시 미리보기에 보이고 내 계정에 저장된다. (마을과 상관없이 하나) */
export default function LabDecorator({ me, onSaved }: { me: Resident; onSaved: () => Promise<void> }) {
  const [style, setStyle] = useState<LabStyle>(() => normalizeLabStyle(me.profile.lab_style));
  const [error, setError] = useState("");

  const change = async (patch: Partial<LabStyle>) => {
    const next = { ...style, ...patch };
    setStyle(next);
    setError("");
    const { error } = await supabase().from("profiles").update({ lab_style: next }).eq("id", me.user_id);
    if (error) return setError(errorMessage(error));
    await onSaved();
  };

  return (
    <div className="space-y-3 p-3">
      {error && <Notice kind="error">{error}</Notice>}
      <div className="px-box sticky top-0 z-10 overflow-hidden bg-paper" style={{ ["--bd" as string]: "#8e5f3b" }}>
        <RoomCanvas owner={{ ...me, profile: { ...me.profile, lab_style: style } }} inside={false} studying={false} boardCount={0} postitColors={[]} shelf={[]} />
      </div>
      <p className="text-xs text-ink-soft">내 연구실은 어느 마을에서 보아도 같은 모습이에요. 고르면 바로 저장돼요.</p>
      <Swatches label="벽지 색" options={LAB_WALLS} value={style.wall} onChange={(wall) => void change({ wall })} />
      <Choices label="벽지 무늬" options={[...LAB_PATTERNS]} value={style.pattern} onChange={(pattern) => void change({ pattern })} />
      <Choices label="바닥" options={[...LAB_FLOORS]} value={style.floor} onChange={(floor) => void change({ floor })} />
      <Choices label="책상" options={[...LAB_DESKS]} value={style.desk} onChange={(desk) => void change({ desk })} />
      <Toggles
        label="책상 위" options={[...LAB_DESK_ITEMS]} values={style.deskItems}
        onToggle={(id) => void change({ deskItems: style.deskItems.includes(id) ? style.deskItems.filter((x) => x !== id) : [...style.deskItems, id] })}
      />
      <Swatches label="커튼·러그 색" options={LAB_ACCENTS} value={style.accent} onChange={(accent) => void change({ accent })} />
      <Choices label="러그" options={[...LAB_RUGS]} value={style.rug} onChange={(rug) => void change({ rug })} />
      <Choices label="창밖 풍경" options={[...LAB_VIEWS]} value={style.view} onChange={(view) => void change({ view })} />
      <Choices label="반려동물" options={[...LAB_PETS]} value={style.pet} onChange={(pet) => void change({ pet })} />
      <Toggles
        label="소품" options={[...LAB_EXTRAS]} values={style.extras}
        onToggle={(id) => void change({ extras: style.extras.includes(id) ? style.extras.filter((x) => x !== id) : [...style.extras, id] })}
      />
    </div>
  );
}
