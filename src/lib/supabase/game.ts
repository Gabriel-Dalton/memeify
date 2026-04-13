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

export async function leaveRoom(roomId: string, userId: string) {
  const client = getClient();
  const del = await client
    .from("room_members")
    .delete()
    .eq("room_id", roomId)
    .eq("user_id", userId);
  if (del.error) throw new Error(del.error.message);
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

// Bake current round's vote counts into room_members.score so the
// leaderboard + per-room scores survive image deletion.
export async function persistRoundScores(roomId: string, roundNumber: number) {
  const client = getClient();

  const memes = await client
    .from("memes")
    .select("id, user_id")
    .eq("room_id", roomId)
    .eq("round_number", roundNumber);
  if (memes.error) throw new Error(memes.error.message);

  const votes = await client
    .from("votes")
    .select("meme_id")
    .eq("room_id", roomId)
    .eq("round_number", roundNumber);
  if (votes.error) throw new Error(votes.error.message);

  const memeToOwner = new Map<string, string>();
  for (const row of memes.data ?? []) {
    memeToOwner.set((row as { id: string }).id, (row as { user_id: string }).user_id);
  }

  const userScore = new Map<string, number>();
  for (const row of votes.data ?? []) {
    const owner = memeToOwner.get((row as { meme_id: string }).meme_id);
    if (owner) userScore.set(owner, (userScore.get(owner) ?? 0) + 1);
  }

  // Read existing scores to add on top (so multi-round scores accumulate).
  const existing = await client
    .from("room_members")
    .select("user_id, score")
    .eq("room_id", roomId);
  if (existing.error) throw new Error(existing.error.message);

  for (const row of existing.data ?? []) {
    const uid = (row as { user_id: string }).user_id;
    const prev = (row as { score: number }).score;
    const add = userScore.get(uid) ?? 0;
    if (add > 0) {
      await client
        .from("room_members")
        .update({ score: prev + add })
        .eq("room_id", roomId)
        .eq("user_id", uid);
    }
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

  // Upsert on (room, user, round) — so a resubmit replaces the prior entry
  // instead of inserting a duplicate. This is what makes the "everyone
  // submitted" detection correct.
  const up = await client
    .from("memes")
    .upsert(
      {
        room_id: args.roomId,
        user_id: user.id,
        nickname: args.nickname,
        image_url: args.imageUrl,
        round_number: args.roundNumber,
      },
      { onConflict: "room_id,user_id,round_number" },
    );

  if (up.error) {
    throw new Error(up.error.message);
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

// Delete all meme rows AND storage files for a given round.
// Called from the host's "Next round" and "Wipe images" buttons.
export async function deleteRoundImages(
  roomId: string,
  roomCode: string,
  roundNumber: number,
) {
  const client = getClient();

  // 1. Fetch urls (so we can strip the storage key) + user_ids for storage
  //    file prefix matching. The uploaded filename pattern is
  //    `${roomCode}/${userId}-${timestamp}.png`, so listing by roomCode
  //    prefix catches all of them for this room. We only delete files
  //    for round-specific memes by looking up their explicit paths.
  const memeRows = await client
    .from("memes")
    .select("image_url")
    .eq("room_id", roomId)
    .eq("round_number", roundNumber);

  if (!memeRows.error && memeRows.data) {
    const paths = memeRows.data
      .map((row) => {
        const url = (row as { image_url: string }).image_url;
        // publicUrl looks like .../storage/v1/object/public/memes/<key>
        const marker = "/memes/";
        const idx = url.indexOf(marker);
        return idx >= 0 ? url.slice(idx + marker.length) : null;
      })
      .filter((p): p is string => !!p);

    if (paths.length > 0) {
      // Best-effort: if storage policy blocks delete, we still wipe DB rows.
      await client.storage.from("memes").remove(paths);
    }
  }

  // 2. Delete DB rows (also cascades votes via FK).
  const del = await client
    .from("memes")
    .delete()
    .eq("room_id", roomId)
    .eq("round_number", roundNumber);
  if (del.error) throw new Error(del.error.message);

  return { deleted: memeRows.data?.length ?? 0 };
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

// Count helpers used by auto-transition logic.
export async function countRoundMemes(roomId: string, roundNumber: number) {
  const client = getClient();
  const { count, error: err } = await client
    .from("memes")
    .select("*", { count: "exact", head: true })
    .eq("room_id", roomId)
    .eq("round_number", roundNumber);
  if (err) throw new Error(err.message);
  return count ?? 0;
}

export async function countActiveMembers(roomId: string) {
  const client = getClient();
  const { count, error: err } = await client
    .from("room_members")
    .select("*", { count: "exact", head: true })
    .eq("room_id", roomId)
    .is("kicked_at", null);
  if (err) throw new Error(err.message);
  return count ?? 0;
}

export async function countRoundVoters(roomId: string, roundNumber: number) {
  const client = getClient();
  // Distinct voters via a RPC-ish pattern — just fetch voter_user_id and dedupe.
  const { data, error: err } = await client
    .from("votes")
    .select("voter_user_id")
    .eq("room_id", roomId)
    .eq("round_number", roundNumber);
  if (err) throw new Error(err.message);
  const unique = new Set((data ?? []).map((r) => (r as { voter_user_id: string }).voter_user_id));
  return unique.size;
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
