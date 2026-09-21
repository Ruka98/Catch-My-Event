"use client"

import Link from "next/link";
import { EventWithProfile } from "@/lib/supabase/types";
import { MapPin, Tag, MoreVertical, Users, Share2, Eye, Edit, Trash2, EyeOff } from "lucide-react";
import { LikeButton } from "./like-button";
import { ShareButton } from "./share-button";
import { useAuth } from "@/components/auth-guard";
import { toggleEventAttendance } from "@/lib/supabase/events.client";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface EventCardProps {
  event: EventWithProfile;
  onAttendanceUpdate: () => void;
  onDelete: (eventId: string) => void;
  onHide: (eventId: string) => void;
}

export function EventCard({ event, onAttendanceUpdate, onDelete, onHide }: EventCardProps) {
  const { user } = useAuth();
  const [isGoing, setIsGoing] = useState(
    !!event.event_attendees?.some(
      (attendee) => attendee.user_id === user?.id && attendee.status === "attending"
    )
  );
  const [isGoingLoading, setIsGoingLoading] = useState(false);

  const priceLabel = event.price === 0 ? "Free" : `LKR ${event.price}`;

  const handleGoing = async () => {
    if (!user) {
      alert("Please sign in to RSVP.");
      return;
    }
    setIsGoingLoading(true);
    try {
      await toggleEventAttendance(event.id, user.id, "attending");
      setIsGoing(!isGoing);
      onAttendanceUpdate(); // Notify parent to refresh data
    } catch (error) {
      console.error("Error toggling attendance:", error);
    } finally {
      setIsGoingLoading(false);
    }
  };

  const isLiked = !!event.likes?.some((like) => like.user_id === user?.id);
  const isOwner = user?.id === event.user_id;

  return (
    <li className="bg-white border rounded-lg p-4 space-y-3 flex flex-col">
      {event.image_url && (
        <div className="relative">
          <img src={event.image_url} alt={event.title} className="w-full h-40 object-cover rounded" />
        </div>
      )}
      <div className="flex-grow space-y-2">
        <Link href={`/events/${event.id}`} className="block text-lg font-semibold hover:underline">
          {event.title}
        </Link>
        {event.category && (
            <Badge variant="outline">{event.category}</Badge>
        )}
        <div className="flex items-center text-sm text-gray-600">
          <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
          <span>{event.location || event.venue}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <Tag className="w-4 h-4 mr-2 flex-shrink-0" />
          <span>{priceLabel}</span>
        </div>
      </div>
      <div className="flex items-center justify-between pt-2 border-t mt-2">
        <div className="flex items-center space-x-2">
          <LikeButton
            eventId={event.id}
            initialLikes={event.like_count ?? 0}
            isLikedInitially={isLiked}
            user={user}
          />
          <Button
            onClick={handleGoing}
            disabled={isGoingLoading}
            variant={isGoing ? "default" : "outline"}
            size="sm"
            className="flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            <span>{isGoing ? "Going" : "Go"}</span>
          </Button>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem asChild>
              <Link href={`/events/${event.id}`} className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => e.preventDefault()}
              className="flex items-center gap-2"
            >
              <ShareButton eventId={event.id} />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onHide(event.id)} className="flex items-center gap-2">
              <EyeOff className="h-4 w-4" />
              Hide Event
            </DropdownMenuItem>
            {isOwner && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/events/${event.id}/edit`} className="flex items-center gap-2">
                    <Edit className="h-4 w-4" />
                    Edit Event
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(event.id)} className="flex items-center gap-2 text-red-500">
                  <Trash2 className="h-4 w-4" />
                  Delete Event
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}