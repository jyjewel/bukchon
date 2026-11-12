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
  message: string;
  message_at: string | null;
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
  /** 머리 위 말풍선 (12시간이 지나면 빈 문자열) */
  say: string;
  /** 접속 여부를 반영한 실제 표시 상태 */
  shown: ResearchState;
  online: boolean;
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

export type AchievementKind = "article" | "book" | "thesis" | "presentation" | "other";

export interface WhiteboardItem {
  id: string;
  village_id: string;
  owner_id: string;
  body: string;
  resolved: boolean;
  created_at: string;
}
export interface WhiteboardComment {
  id: string;
  item_id: string;
  village_id: string;
  author_id: string;
  body: string;
  created_at: string;
}
export interface Postit {
  id: string;
  village_id: string;
  owner_id: string;
  author_id: string;
  body: string;
  color: string;
  created_at: string;
}
export interface Achievement {
  id: string;
  village_id: string;
  owner_id: string;
  title: string;
  kind: AchievementKind;
  year: number | null;
  link_url: string;
  created_at: string;
}
export interface AppNotification {
  id: string;
  user_id: string;
  village_id: string;
  actor_id: string;
  kind: "postit" | "comment" | "chat_request" | "meeting";
  room_owner_id: string;
  summary: string;
  created_at: string;
  read_at: string | null;
}
export type BoardTab = "whiteboard" | "shelf";

export interface ResearchNote {
  id: string;
  category: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
}
export interface DailyLog {
  log_date: string;
  body: string;
  updated_at: string;
}
export interface Conversation {
  id: string;
  village_id: string;
  user_a: string;
  user_b: string;
  status: "pending" | "active" | "declined" | "ended";
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  last_sender: string | null;
  read_a: string;
  read_b: string;
}
export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}
export interface Book {
  id: string;
  village_id: string;
  title: string;
  topic: string;
  status: "writing" | "finished";
  created_by: string | null;
  created_at: string;
}
export interface BookEntry {
  id: string;
  book_id: string;
  village_id: string;
  author_id: string | null;
  heading: string;
  body: string;
  created_at: string;
}
export interface Meeting {
  id: string;
  village_id: string;
  title: string;
  starts_at: string;
  zoom_url: string;
  note: string;
  created_by: string | null;
  created_at: string;
}
