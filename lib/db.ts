import { db } from "../src/prisma/db";

export { db };

// Re-export entity query proxies
export const usersDb = db.orm.public.User;
export const conversationsDb = db.orm.public.Conversation;
export const membersDb = db.orm.public.ConversationMember;
export const messagesDb = db.orm.public.Message;
export const receiptsDb = db.orm.public.MessageReceipt;
export const mediaDb = db.orm.public.Media;
export const moderationLogsDb = db.orm.public.ModerationLog;
export const cachedGiphyAssetsDb = db.orm.public.CachedGiphyAsset;

/**
 * Ensures a direct conversation exists between two users (with unique directKey)
 */
export async function getOrCreateDirectConversation(userId1: string, userId2: string) {
  const directKey = [userId1, userId2].sort().join(":");

  // Check if conversation already exists
  const existing = await conversationsDb.where({ directKey }).first();
  if (existing) {
    for (const uid of [userId1, userId2]) {
      const mem = await membersDb.where({ conversationId: existing.id, userId: uid }).first();
      if (!mem) {
        await membersDb.create({
          id: crypto.randomUUID(),
          conversationId: existing.id,
          userId: uid,
          role: "MEMBER",
          unreadCount: 0,
          lastReadAt: new Date().toISOString(),
          joinedAt: new Date().toISOString(),
        });
      }
    }
    return existing;
  }

  // Create new direct conversation
  const convId = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    await conversationsDb.create({
      id: convId,
      type: "DIRECT",
      title: null,
      directKey,
      createdAt: now,
      updatedAt: now,
    });

    // Add both members
    for (const uid of [userId1, userId2]) {
      await membersDb.create({
        id: crypto.randomUUID(),
        conversationId: convId,
        userId: uid,
        role: "MEMBER",
        unreadCount: 0,
        lastReadAt: now,
        joinedAt: now,
      });
    }

    return await conversationsDb.where({ id: convId }).first();
  } catch (err: any) {
    // If concurrent insert occurred, return the winning conversation and ensure memberships
    const winner = await conversationsDb.where({ directKey }).first();
    if (winner) {
      for (const uid of [userId1, userId2]) {
        const mem = await membersDb.where({ conversationId: winner.id, userId: uid }).first();
        if (!mem) {
          try {
            await membersDb.create({
              id: crypto.randomUUID(),
              conversationId: winner.id,
              userId: uid,
              role: "MEMBER",
              unreadCount: 0,
              lastReadAt: now,
              joinedAt: now,
            });
          } catch {}
        }
      }
      return winner;
    }
    throw err;
  }
}

/**
 * Checks if a user is a valid member of a conversation
 */
export async function verifyConversationMembership(conversationId: string, userId: string): Promise<boolean> {
  const member = await membersDb.where({ conversationId, userId }).first();
  return !!member;
}
