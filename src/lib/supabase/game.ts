import { generateRoomCode } from "@/lib/utils";
import { type LeaderboardEntry, type Meme, type Room, type RoomMember, type Vote } from "@/types/memeify";
import { ensureAuthenticatedUser, supabase } from "./client";

const ROOM_COLUMNS = "id, code, name, status, round_number, created_by, created_at";
const MEMBER_COLUMNS =
  "id, room_id, user_id, nickname, score, joined_at, submitted_at, kicked_at";

function sleep(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function getClient() {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to continue.",
    );
  }
  return supabase;
}

export async function createRoomAndJoin(roomName: string, nickname: string) {
  const client = getClient();
  const user = await ensureAuthenticatedUser();

  let room: Room | null = null;
  let lastErrorMessage = "";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateRoomCode();
    const roomInsert = await client
      .from("rooms")
      .insert({
        code,
        name: roomName,
        status: "waiting",
        round_number: 1,
        created_by: user.id,
      })
      .select(ROOM_COLUMNS)
      .single<Room>();

    if (!roomInsert.error && roomInsert.data) {
      room = roomInsert.data;
      break;
    }

    lastErrorMessage = roomInsert.error?.message ?? "Unknown database error.";
    if (roomInsert.error?.code !== "23505") {
      break;
    }

    await sleep(40 * (attempt + 1));
  }

  if (!room) {
    throw new Error(
      `Failed to create room after multiple attempts. Last error: ${lastErrorMessage}`,
    );
  }

  const memberInsert = await client.from("room_members").insert({
    room_id: room.id,
    user_id: user.id,
    nickname,
  });

  if (memberInsert.error) {
    throw new Error(memberInsert.error.message);
  }

  return {
    roomCode: room.code,
    userId: user.id,
  };
}

export async function joinRoomByCode(roomCode: string, nickname: string) {
  const client = getClient();
  const user = await ensureAuthenticatedUser();

  const roomLookup = await client
    .from("rooms")
    .select(ROOM_COLUMNS)
    .eq("code", roomCode)
    .single<Room>();

  if (roomLookup.error || !roomLookup.data) {
    throw new Error("Room not found.");
  }

  // If the user was previously kicked, un-kick them on rejoin (host may have
  // changed their mind — or this is a totally new browser). Simpler than
  // blocking, fits the casual vibe.
  const upsertMember = await client.from("room_members").upsert(
    {
      room_id: roomLookup.data.id,
      user_id: user.id,
      nickname,
      kicked_at: null,
    },
    { onConflict: "room_id,user_id" },
  );

  if (upsertMember.error) {
    throw new Error(upsertMember.error.message);
  }

  return {
    roomCode: roomLookup.data.code,
    userId: user.id,
  };
}

export async function getRoom(roomCode: string) {
  const client = getClient();
  const roomLookup = await client
    .from("rooms")
    .select(ROOM_COLUMNS)
    .eq("code", roomCode)
    .single<Room>();

  if (roomLookup.error) {
    throw new Error(roomLookup.error.message);
  }

  return roomLookup.data;
}

export async function getRoomMembers(roomId: string, includeKicked = false) {
  const client = getClient();
  const query = client
    .from("room_members")
    .select(MEMBER_COLUMNS)
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });

  const members = includeKicked ? await query : await query.is("kicked_at", null);

  if (members.error) {
    throw new Error(members.error.message);
  }

  return members.data as RoomMember[];
}

export async function getMyMembership(roomId: string, userId: string) {
  const client = getClient();
  const row = await client
    .from("room_members")
    .select(MEMBER_COLUMNS)
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle<RoomMember>();

  if (row.error) {
    throw new Error(row.error.message);
  }

  return row.data;
}

export async function kickMember(roomId: string, userId: string) {
  const client = getClient();
  const update = await client
    .from("room_members")
    .update({ kicked_at: new Date().toISOString() })
    .eq("room_id", roomId)
    .eq("user_id", userId);

  if (update.error) {
    throw new Error(update.error.message);
  }
}

export async function setRoomStatus(roomId: string, status: Room["status"]) {
  const client = getClient();
  const updated = await client.from("rooms").update({ status }).eq("id", roomId);
  if (updated.error) {
    throw new Error(updated.error.message);
  }
}

export async function startNextRound(roomId: string, currentRound: number) {
  const client = getClient();
  const updated = await client
    .from("rooms")
    .update({ status: "editing", round_number: currentRound + 1 })
    .eq("id", roomId);
  if (updated.error) {
    throw new Error(updated.error.message);
  }
}

export async function uploadMemeImage(roomCode: string, userId: string, pngBlob: Blob) {
  const client = getClient();
  const key = `${roomCode}/${userId}-${Date.now()}.png`;
  const upload = await client.storage.from("memes").upload(key, pngBlob, {
    cacheControl: "3600",
    contentType: "image/png",
    upsert: false,
  });

  if (upload.error) {
    throw new Error(upload.error.message);
  }

  const publicUrl = client.storage.from("memes").getPublicUrl(upload.data.path);
  return publicUrl.data.publicUrl;
}

export async function submitMeme(args: {
  roomId: string;
  roundNumber: number;
  nickname: string;
  imageUrl: string;
}) {
  const client = getClient();
  const user = await ensureAuthenticatedUser();

  const insert = await client.from("memes").insert({
    room_id: args.roomId,
    user_id: user.id,
    nickname: args.nickname,
    image_url: args.imageUrl,
    round_number: args.roundNumber,
  });

  if (insert.error) {
    throw new Error(insert.error.message);
  }

  const markSubmitted = await client
    .from("room_members")
    .update({ submitted_at: new Date().toISOString() })
    .eq("room_id", args.roomId)
    .eq("user_id", user.id);

  if (markSubmitted.error) {
    throw new Error(markSubmitted.error.message);
  }
}

export async function getRoundMemes(roomId: string, roundNumber: number) {
  const client = getClient();
  const memes = await client
    .from("memes")
    .select("id, room_id, user_id, nickname, image_url, round_number, created_at")
    .eq("room_id", roomId)
    .eq("round_number", roundNumber)
    .order("created_at", { ascending: true });

  if (memes.error) {
    throw new Error(memes.error.message);
  }

  return memes.data as Meme[];
}

export async function castVote(roomId: string, memeId: string, roundNumber: number) {
  const client = getClient();
  const user = await ensureAuthenticatedUser();

  const insert = await client.from("votes").insert({
    room_id: roomId,
    meme_id: memeId,
    voter_user_id: user.id,
    round_number: roundNumber,
  });

  if (insert.error) {
    throw new Error(insert.error.message);
  }
}

export async function getVotes(roomId: string, roundNumber: number) {
  const client = getClient();
  const votes = await client
    .from("votes")
    .select("id, room_id, meme_id, voter_user_id, round_number, created_at")
    .eq("room_id", roomId)
    .eq("round_number", roundNumber);

  if (votes.error) {
    throw new Error(votes.error.message);
  }

  return votes.data as Vote[];
}

export async function getGlobalLeaderboard(limit = 25): Promise<LeaderboardEntry[]> {
  const client = getClient();
  const rows = await client
    .from("leaderboard")
    .select("user_id, nickname, total_votes, total_memes")
    .order("total_votes", { ascending: false })
    .order("total_memes", { ascending: false })
    .limit(limit);

  if (rows.error) {
    throw new Error(rows.error.message);
  }

  return (rows.data ?? []).map((row) => ({
    userId: row.user_id as string,
    nickname: row.nickname as string,
    totalVotes: row.total_votes as number,
    totalMemes: row.total_memes as number,
  }));
}
