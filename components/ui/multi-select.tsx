"use client"

import * as React from "react"
import { cva } from "class-variance-authority"
import { CheckIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const multiSelectVariants = cva(
  "m-1 transition ease-in-out delay-150 hover:-translate-y-1 hover:scale-110 duration-300",
  {
    variants: {
      variant: {
        default: "border-foreground/10 text-foreground bg-card hover:bg-card/80",
        secondary: "border-foreground/10 bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        inverted: "inverted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

interface MultiSelectProps extends React.ComponentPropsWithoutRef<typeof PopoverTrigger> {
  options: {
    label: string
    value: string
    icon?: React.ComponentType<{ className?: string }>
  }[]
  selected: string[]
  onChange: React.Dispatch<React.SetStateAction<string[]>>
  className?: string
  placeholder?: string
}

const MultiSelect = React.forwardRef<React.ElementRef<typeof PopoverTrigger>, MultiSelectProps>(
  ({ options, selected, onChange, className, ...props }, ref) => {
    const [open, setOpen] = React.useState(false)

    const handleUnselect = (item: string) => {
      onChange(selected.filter((i) => i !== item))
    }

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild ref={ref}>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={`w-full justify-between ${selected.length > 0 ? "h-full" : "h-10"}`}
            onClick={() => setOpen(!open)}
          >
            <div className="flex flex-wrap items-center gap-1">
              {selected.length > 0 ? (
                options
                  .filter((option) => selected.includes(option.value))
                  .map((option) => (
                    <Badge
                      key={option.value}
                      variant="secondary"
                      className={cn("mr-1", multiSelectVariants())}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleUnselect(option.value)
                      }}
                    >
                      {option.label}
                      <XIcon className="ml-2 h-4 w-4 cursor-pointer" />
                    </Badge>
                  ))
              ) : (
                <span className="text-muted-foreground">{props.placeholder ?? "Select options"}</span>
              )}
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search ..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => {
                  const isSelected = selected.includes(option.value)
                  return (
                    <CommandItem
                      key={option.value}
                      onSelect={() => {
                        if (isSelected) {
                          handleUnselect(option.value)
                        } else {
                          onChange([...selected, option.value])
                        }
                      }}
                    >
                      <CheckIcon className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                      {option.label}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    )
  },
)

MultiSelect.displayName = "MultiSelect"

export { MultiSelect }