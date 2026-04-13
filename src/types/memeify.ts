export type RoomStatus = "waiting" | "editing" | "voting" | "results";

export interface Room {
  id: string;
  code: string;
  name: string;
  status: RoomStatus;
  round_number: number;
  created_at: string;
}

export interface RoomMember {
  id: string;
  room_id: string;
  user_id: string;
  nickname: string;
  score: number;
  joined_at: string;
  submitted_at: string | null;
}

export interface Meme {
  id: string;
  room_id: string;
  user_id: string;
  nickname: string;
  image_url: string;
  round_number: number;
  created_at: string;
}

export interface Vote {
  id: string;
  room_id: string;
  meme_id: string;
  voter_user_id: string;
  round_number: number;
  created_at: string;
}

export interface LeaderboardEntry {
  userId: string;
  nickname: string;
  totalVotes: number;
  totalMemes: number;
}
