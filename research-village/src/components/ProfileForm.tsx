"use client";
import { useState, type FormEvent } from "react";
import { errorMessage, supabase } from "@/lib/supabase";
import { ACCESSORIES, HAIR_COLORS, HAIR_STYLES, OUTFITS, SKINS } from "@/lib/constants";
import type { Avatar, Profile } from "@/lib/types";
import { CharacterIcon } from "./Character";
import { Choices, Notice, Swatches } from "./ui";

export default function ProfileForm({
  profile, submitLabel, onSaved, markOnboarded = false,
}: { profile: Profile; submitLabel: string; onSaved: () => void | Promise<void>; markOnboarded?: boolean }) {
  const [name, setName] = useState(profile.display_name);
  const [field, setField] = useState(profile.field);
  const [bio, setBio] = useState(profile.bio);
  const [avatar, setAvatar] = useState<Avatar>({
    skin: SKINS[0], hair: "short", hairColor: HAIR_COLORS[0], outfit: OUTFITS[0], accessory: "none", ...profile.avatar,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const set = (patch: Partial<Avatar>) => { setAvatar((a) => ({ ...a, ...patch })); setSaved(false); };

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
    setSaved(true);
    await onSaved();
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="card flex shrink-0 flex-col items-center gap-2 self-center px-6 py-3 sm:self-start">
          <CharacterIcon avatar={avatar} size={120} />
          <span className="font-display text-sm">{name || "이름 없음"}</span>
        </div>
        <div className="flex-1 space-y-3">
          <Swatches label="피부" options={SKINS} value={avatar.skin!} onChange={(skin) => set({ skin })} />
          <Choices label="헤어스타일" options={HAIR_STYLES} value={avatar.hair!} onChange={(hair) => set({ hair })} />
          <Swatches label="머리 색" options={HAIR_COLORS} value={avatar.hairColor!} onChange={(hairColor) => set({ hairColor })} />
          <Swatches label="옷 색" options={OUTFITS} value={avatar.outfit!} onChange={(outfit) => set({ outfit })} />
          <Choices label="액세서리" options={ACCESSORIES} value={avatar.accessory!} onChange={(accessory) => set({ accessory })} />
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
