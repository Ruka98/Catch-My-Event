"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Trash2 } from "lucide-react";

type DeleteEventButtonProps = {
  eventId: string;
  onDelete?: () => void;
};

export function DeleteEventButton({ eventId, onDelete }: DeleteEventButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const supabase = createClient();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);

      if (error) {
        throw error;
      }

      toast({
        title: "Event Deleted",
        description: "Your event has been successfully deleted.",
      });

      if (onDelete) {
        onDelete();
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to delete event", error);
      toast({
        title: "Error",
        description: "Failed to delete event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete your event
            and remove all associated data.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isDeleting}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Event"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}