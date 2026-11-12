export type ResearchState = "offline" | "focus" | "open" | "library" | "rest";
export type DiaryVisibility = "private" | "village" | "selected";
export type DiaryKind = "daily" | "reading" | "progress" | "writing";

export interface Avatar {
  skin?: string;
  hair?: string; // 헤어스타일 id
  hairColor?: string;
  outfit?: string; // 옷 색
  accessory?: string;
}

export interface HouseStyle {
  roof?: string;
  wall?: string;
}

export interface Profile {
  id: string;
  display_name: string;
  field: string;
  bio: string;
  keywords: string[];
  avatar: Avatar;
  share_study_time: boolean;
  onboarded: boolean;
}

export interface Village {
  id: string;
  name: string;
  theme: string;
}

export interface StatusRow {
  village_id: string;
  user_id: string;
  status: ResearchState;
  topic: string;
  reading: string;
  last_seen_at: string;
  left_at: string | null;
  updated_at: string;
}

export interface House {
  village_id: string;
  slot: number;
  owner_id: string | null;
  style: HouseStyle;
}

export interface Resident {
  user_id: string;
  role: "admin" | "member";
  joined_at: string;
  slot: number;
  profile: Profile;
  house: House;
  status: StatusRow;
  /** 접속 여부를 반영한 실제 표시 상태 */
  shown: ResearchState;
  online: boolean;
}

export interface StudySession {
  id: string;
  user_id: string;
  village_id: string | null;
  subject: string;
  started_at: string;
  ended_at: string | null;
  running_since: string | null;
  accumulated_seconds: number;
}

export interface DiaryEntry {
  id: string;
  village_id: string;
  author_id: string;
  kind: DiaryKind;
  title: string;
  body: string;
  link_url: string;
  visibility: DiaryVisibility;
  created_at: string;
  updated_at: string;
}
