"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageCircle, Heart, Reply } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import Link from "next/link"
import type { Comment } from "@/lib/supabase/types"

interface CommentsSectionProps {
  eventId: string
  comments: Comment[]
  user: SupabaseUser | null
  onCommentsUpdate?: (comments: Comment[]) => void
}

export function CommentsSection({ eventId, comments: initialComments, user, onCommentsUpdate }: CommentsSectionProps) {
  const [comments, setComments] = useState(initialComments)
  const [newComment, setNewComment] = useState("")
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isSubmittingReply, setIsSubmittingReply] = useState(false)
  const supabase = createClient()

  const handleCommentSubmit = async () => {
    if (!user || !newComment.trim() || isSubmittingComment) return

    setIsSubmittingComment(true)
    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          event_id: eventId,
          user_id: user.id,
          content: newComment.trim(),
        })
        .select(`
          *,
          profiles (
            display_name,
            avatar_url
          )
        `)
        .single()

      if (error) throw error

      if (data) {
        const updatedComments = [data, ...comments]
        setComments(updatedComments)
        setNewComment("")
        onCommentsUpdate?.(updatedComments)
      }
    } catch (error) {
      console.error("Error posting comment:", error)
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleReplySubmit = async (parentId: string) => {
    if (!user || !replyContent.trim() || isSubmittingReply) return

    setIsSubmittingReply(true)
    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          event_id: eventId,
          user_id: user.id,
          content: replyContent.trim(),
          parent_id: parentId,
        })
        .select(`
          *,
          profiles (
            display_name,
            avatar_url
          )
        `)
        .single()

      if (error) throw error

      if (data) {
        // Add reply to the parent comment
        const updatedComments = comments.map((comment) => {
          if (comment.id === parentId) {
            return {
              ...comment,
              replies: [...(comment.replies || []), data],
            }
          }
          return comment
        })

        setComments(updatedComments)
        setReplyContent("")
        setReplyingTo(null)
        onCommentsUpdate?.(updatedComments)
      }
    } catch (error) {
      console.error("Error posting reply:", error)
    } finally {
      setIsSubmittingReply(false)
    }
  }

  const handleLikeComment = async (commentId: string) => {
    if (!user) return

    try {
      // Toggle like
      const { data: existingLike } = await supabase
        .from("comment_likes")
        .select("id")
        .eq("comment_id", commentId)
        .eq("user_id", user.id)
        .single()

      if (existingLike) {
        // Unlike
        await supabase.from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", user.id)
      } else {
        // Like
        await supabase.from("comment_likes").insert({
          comment_id: commentId,
          user_id: user.id,
        })
      }

      // Update local state
      setComments(
        comments.map((comment) => {
          if (comment.id === commentId) {
            return {
              ...comment,
              user_liked: !comment.user_liked,
              likes_count: (comment.likes_count || 0) + (existingLike ? -1 : 1),
            }
          }
          return comment
        }),
      )
    } catch (error) {
      console.error("Error liking comment:", error)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return "just now"
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`

    return date.toLocaleDateString()
  }

  return (
    <Card className="border-orange-200">
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageCircle className="w-5 h-5 mr-2 text-orange-500" />
          Comments ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Add Comment */}
        {user ? (
          <div className="mb-6">
            <div className="flex space-x-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={user.user_metadata?.avatar_url || "/placeholder.svg"} />
                <AvatarFallback>
                  {(user.user_metadata?.display_name || user.email || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Textarea
                  placeholder="Share your thoughts about this event..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="mb-3 border-orange-200 focus:border-orange-500"
                  rows={3}
                />
                <Button
                  onClick={handleCommentSubmit}
                  disabled={!newComment.trim() || isSubmittingComment}
                  className="bg-orange-500 hover:bg-orange-600"
                  size="sm"
                >
                  {isSubmittingComment ? "Posting..." : "Post Comment"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-600">
              <Link href="/auth/login" className="text-orange-600 hover:text-orange-700 underline">
                Sign in
              </Link>{" "}
              to join the conversation
            </p>
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-6">
          {comments.map((comment) => (
            <div key={comment.id} className="space-y-3">
              {/* Main Comment */}
              <div className="flex space-x-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={comment.profiles.avatar_url || "/placeholder.svg"} />
                  <AvatarFallback>{comment.profiles.display_name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-gray-900">{comment.profiles.display_name}</p>
                      <p className="text-sm text-gray-500">{formatTimeAgo(comment.created_at)}</p>
                    </div>
                  </div>
                  <p className="text-gray-700 mb-3">{comment.content}</p>

                  {/* Comment Actions */}
                  <div className="flex items-center space-x-4">
                    {user && (
                      <>
                        <button
                          onClick={() => handleLikeComment(comment.id)}
                          className={`flex items-center space-x-1 text-sm ${
                            comment.user_liked ? "text-red-600" : "text-gray-500 hover:text-red-600"
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${comment.user_liked ? "fill-current" : ""}`} />
                          <span>{comment.likes_count || 0}</span>
                        </button>
                        <button
                          onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                          className="flex items-center space-x-1 text-sm text-gray-500 hover:text-orange-600"
                        >
                          <Reply className="w-4 h-4" />
                          <span>Reply</span>
                        </button>
                      </>
                    )}
                  </div>

                  {/* Reply Form */}
                  {replyingTo === comment.id && user && (
                    <div className="mt-4 flex space-x-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={user.user_metadata?.avatar_url || "/placeholder.svg"} />
                        <AvatarFallback className="text-xs">
                          {(user.user_metadata?.display_name || user.email || "U").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <Textarea
                          placeholder="Write a reply..."
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          className="mb-2 border-orange-200 focus:border-orange-500"
                          rows={2}
                        />
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => handleReplySubmit(comment.id)}
                            disabled={!replyContent.trim() || isSubmittingReply}
                            className="bg-orange-500 hover:bg-orange-600"
                            size="sm"
                          >
                            {isSubmittingReply ? "Replying..." : "Reply"}
                          </Button>
                          <Button
                            onClick={() => {
                              setReplyingTo(null)
                              setReplyContent("")
                            }}
                            variant="outline"
                            size="sm"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="ml-12 space-y-3">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="flex space-x-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={reply.profiles.avatar_url || "/placeholder.svg"} />
                        <AvatarFallback className="text-xs">
                          {reply.profiles.display_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 bg-white border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="font-medium text-gray-900 text-sm">{reply.profiles.display_name}</p>
                          <p className="text-xs text-gray-500">{formatTimeAgo(reply.created_at)}</p>
                        </div>
                        <p className="text-gray-700 text-sm">{reply.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {comments.length === 0 && (
            <div className="text-center py-12">
              <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No comments yet</h3>
              <p className="text-gray-500">Be the first to share your thoughts about this event!</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
