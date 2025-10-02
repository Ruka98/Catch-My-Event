"use client"

import { useState } from "react"
import type { Event } from "@/types/events"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { format, isSameDay } from "date-fns"

interface InteractiveCalendarProps {
  events: Event[]
}

const InteractiveCalendar = ({ events }: InteractiveCalendarProps) => {
  const [date, setDate] = useState<Date | undefined>(new Date())

  const eventsByDate = events.reduce(
    (acc, event) => {
      const eventDate = format(new Date(event.start_time), "yyyy-MM-dd")
      if (!acc[eventDate]) {
        acc[eventDate] = []
      }
      acc[eventDate].push(event)
      return acc
    },
    {} as Record<string, Event[]>,
  )

  const DayContent = ({ date }: { date: Date }) => {
    const formattedDate = format(date, "yyyy-MM-dd")
    const dailyEvents = eventsByDate[formattedDate]

    if (!dailyEvents) {
      return <div>{format(date, "d")}</div>
    }

    return (
      <Popover>
        <PopoverTrigger asChild>
          <div className="relative h-full w-full">
            {format(date, "d")}
            {dailyEvents.length > 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Image
                  src={dailyEvents[0].image_url ?? "/placeholder.png"}
                  alt={dailyEvents[0].title}
                  width={24}
                  height={24}
                  className="h-6 w-6 rounded-full object-cover"
                />
                {dailyEvents.length > 1 && (
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-sky-500 text-xs font-bold text-white">
                    {dailyEvents.length}
                  </span>
                )}
              </div>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">
                Events on {format(date, "PPP")}
              </h4>
              <p className="text-sm text-muted-foreground">
                You have {dailyEvents.length} event(s) scheduled for this day.
              </p>
            </div>
            <div className="grid gap-2">
              {dailyEvents.map((event) => (
                <div
                  key={event.id}
                  className="grid grid-cols-[25px_1fr] items-start pb-4 last:pb-0"
                >
                  <span className="flex h-2 w-2 translate-y-1 rounded-full bg-sky-500" />
                  <div className="grid gap-1">
                    <p className="text-sm font-medium leading-none">
                      {event.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(event.start_time), "p")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Calendar
      mode="single"
      selected={date}
      onSelect={setDate}
      className="rounded-md border"
      components={{
        DayContent,
      }}
    />
  )
}

export default InteractiveCalendar