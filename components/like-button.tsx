"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface LikeButtonProps {
  eventId: string;
  initialLikes: number;
  isLikedInitially: boolean;
  user: User | null;
}

export function LikeButton({
  eventId,
  initialLikes,
  isLikedInitially,
  user,
}: LikeButtonProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(isLikedInitially);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const handleLike = async () => {
    if (!user) {
      // Or redirect to login
      alert("Please sign in to like events.");
      return;
    }

    setIsLoading(true);

    if (isLiked) {
      // Unlike
      const { error } = await supabase
        .from("likes")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", user.id);

      if (!error) {
        setLikes(likes - 1);
        setIsLiked(false);
      } else {
        console.error("Error unliking event:", error);
      }
    } else {
      // Like
      const { error } = await supabase
        .from("likes")
        .insert({ event_id: eventId, user_id: user.id });

      if (!error) {
        setLikes(likes + 1);
        setIsLiked(true);
      } else {
        console.error("Error liking event:", error);
      }
    }

    setIsLoading(false);
  };

  return (
    <Button
      onClick={handleLike}
      disabled={isLoading}
      variant="outline"
      className="flex items-center gap-2"
    >
      <Heart
        className={`w-5 h-5 ${
          isLiked ? "text-red-500 fill-current" : "text-gray-500"
        }`}
      />
      <span>{likes} {likes === 1 ? "Like" : "Likes"}</span>
    </Button>
  );
}