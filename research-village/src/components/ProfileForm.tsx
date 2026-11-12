"use client";
import { useState, type FormEvent } from "react";
import { errorMessage, supabase } from "@/lib/supabase";
import { ACCENTS, ACCESSORIES, BEARDS, EYES, FEATURES, PANTS, SHOES, EYEWEAR, HAIR_COLORS, HAIR_STYLES, BAGS, HAND_PROPS, HATS, OUTFITS, PROPS, SKINS, TOPS } from "@/lib/constants";
import type { Profile } from "@/lib/types";
import { normalizeAvatar, type FullAvatar } from "@/pixel/avatar";
import { CharacterIcon } from "./Character";
import { Choices, Notice, Swatches, Toggles } from "./ui";

export default function ProfileForm({
  profile, submitLabel, onSaved, markOnboarded = false, status, onSaveStatus,
}: {
  profile: Profile; submitLabel: string; onSaved: () => void | Promise<void>; markOnboarded?: boolean;
  /** 마을에 살고 있을 때만: 지금 하는 연구(주제·읽는 책) */
  status?: { topic: string; reading: string }; onSaveStatus?: (patch: { topic: string; reading: string }) => Promise<string | null>;
}) {
  const [name, setName] = useState(profile.display_name);
  const [field, setField] = useState(profile.field);
  const [bio, setBio] = useState(profile.bio);
  const [topic, setTopic] = useState(status?.topic ?? "");
  const [reading, setReading] = useState(status?.reading ?? "");
  const [avatar, setAvatar] = useState<FullAvatar>(() => normalizeAvatar(profile.avatar));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const set = (patch: Partial<FullAvatar>) => { setAvatar((a) => ({ ...a, ...patch })); setSaved(false); };
  /** 소품: 손에 든 것은 하나, 가방도 하나만. 둘은 같이 쓸 수 있다 */
  const toggleProp = (id: string) => {
    const has = avatar.props.includes(id);
    const group = (HAND_PROPS.some((p) => p.id === id) ? HAND_PROPS : BAGS).map((p) => p.id);
    set({ props: has ? avatar.props.filter((p) => p !== id) : [...avatar.props.filter((p) => !group.includes(p)), id] });
  };
  /** 액세서리는 여러 개를 동시에 쓸 수 있고, 안경류만 하나로 제한한다 */
  const toggleAccessory = (id: string) => {
    const has = avatar.accessories.includes(id);
    let next = has ? avatar.accessories.filter((a) => a !== id) : [...avatar.accessories, id];
    if (!has && EYEWEAR.includes(id)) next = next.filter((a) => a === id || !EYEWEAR.includes(a));
    set({ accessories: next });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase()
      .from("profiles")
      .update({ display_name: name.trim(), field: field.trim(), bio: bio.trim(), avatar, ...(markOnboarded ? { onboarded: true } : {}) })
      .eq("id", profile.id);
    setBusy(false);
    if (error) return setError(errorMessage(error));
    if (onSaveStatus) {
      const msg = await onSaveStatus({ topic: topic.trim(), reading: reading.trim() });
      if (msg) return setError(msg);
    }
    setSaved(true);
    await onSaved();
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="card flex shrink-0 flex-col items-center gap-2 self-center px-6 py-3 sm:sticky sm:top-4 sm:self-start">
          <CharacterIcon avatar={avatar} size={120} />
          <span className="font-display text-sm">{name || "이름 없음"}</span>
        </div>
        <div className="flex-1 space-y-3">
          <Swatches label="피부" options={SKINS} value={avatar.skin} onChange={(skin) => set({ skin })} />
          <Choices label="헤어스타일" options={HAIR_STYLES} value={avatar.hair} onChange={(hair) => set({ hair })} />
          <Swatches label="머리 색" options={HAIR_COLORS} value={avatar.hairColor} onChange={(hairColor) => set({ hairColor })} />
          <Choices label="표정" options={EYES} value={avatar.eyes} onChange={(eyes) => set({ eyes })} />
          <Choices label="수염" options={BEARDS} value={avatar.beard} onChange={(beard) => set({ beard })} />
          <Toggles label="얼굴" options={FEATURES} values={avatar.features} onToggle={(id) => set({ features: avatar.features.includes(id) ? avatar.features.filter((x) => x !== id) : [...avatar.features, id] })} />
          <Choices label="옷" options={TOPS} value={avatar.top} onChange={(top) => set({ top })} />
          <Swatches label="옷 색" options={OUTFITS} value={avatar.outfit} onChange={(outfit) => set({ outfit })} />
          <Swatches label="바지 색" options={PANTS} value={avatar.pants} onChange={(pants) => set({ pants })} />
          <Choices label="신발" options={SHOES} value={avatar.shoes} onChange={(shoes) => set({ shoes })} />
          <Choices label="모자" options={HATS} value={avatar.hat} onChange={(hat) => set({ hat })} />
          <Toggles label="액세서리 (여러 개 가능)" options={ACCESSORIES} values={avatar.accessories} onToggle={toggleAccessory} />
          <Swatches label="모자·소품 색" options={ACCENTS} value={avatar.accent} onChange={(accent) => set({ accent })} />
          <Toggles label="소품" options={PROPS} values={avatar.props} onToggle={toggleProp} />
        </div>
      </div>
      <div className="dotted pt-3">
        <label className="label" htmlFor="pf-name">이름</label>
        <input id="pf-name" className="input" value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} maxLength={20} required />
      </div>
      <div>
        <label className="label" htmlFor="pf-field">연구 분야</label>
        <input id="pf-field" className="input" value={field} onChange={(e) => { setField(e.target.value); setSaved(false); }} maxLength={60} placeholder="예: 한국사, 번역학" />
      </div>
      {status && (
        <>
          <div>
            <label className="label" htmlFor="pf-topic">현재 연구 주제</label>
            <input id="pf-topic" className="input" maxLength={120} value={topic} onChange={(e) => { setTopic(e.target.value); setSaved(false); }} placeholder="예: 조선 후기 방각본의 유통" />
          </div>
          <div>
            <label className="label" htmlFor="pf-reading">읽고 있는 책</label>
            <input id="pf-reading" className="input" maxLength={120} value={reading} onChange={(e) => { setReading(e.target.value); setSaved(false); }} />
          </div>
        </>
      )}
      <div>
        <label className="label" htmlFor="pf-bio">자기소개</label>
        <textarea id="pf-bio" className="input" rows={3} value={bio} onChange={(e) => { setBio(e.target.value); setSaved(false); }} maxLength={300} />
      </div>
      {error && <Notice kind="error">{error}</Notice>}
      <div className="flex items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={busy || !name.trim()}>{busy ? "저장 중…" : submitLabel}</button>
        {saved && <span className="text-sm text-mint-deep" role="status">저장했어요!</span>}
      </div>
    </form>
  );
}
