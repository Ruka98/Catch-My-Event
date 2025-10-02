import { createSupabaseServerClient } from "./server";
import type { Comment } from "./types";

const commentWithLikesAndProfile = `
  *,
  profiles(display_name, avatar_url),
  comment_likes(user_id)
`;

export async function getCommentsForEvent(
  eventId: string,
  userId?: string | null,
): Promise<Comment[]> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("comments")
    .select(commentWithLikesAndProfile)
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching comments:", error);
    return [];
  }

  const comments = (data || []).map((comment) => ({
    ...comment,
    user_liked: userId
      ? comment.comment_likes.some((like) => like.user_id === userId)
      : false,
    likes_count: comment.comment_likes.length,
  }));

  // Now, let's build the nested structure.
  const commentMap = new Map<string, Comment>();
  const topLevelComments: Comment[] = [];

  for (const comment of comments) {
    comment.replies = [];
    commentMap.set(comment.id, comment);
  }

  for (const comment of comments) {
    if (comment.parent_id && commentMap.has(comment.parent_id)) {
      commentMap.get(comment.parent_id)!.replies!.push(comment);
    } else {
      topLevelComments.push(comment);
    }
  }

  return topLevelComments;
}