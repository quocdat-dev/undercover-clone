'use client'

import * as React from "react"
import { Chip as HeroUIChip, ChipProps as HeroUIChipProps } from '@heroui/react'
import { cn } from "@/lib/utils"

export interface BadgeProps extends Omit<HeroUIChipProps, 'variant'> {
  variant?: "default" | "secondary" | "destructive" | "outline"
}

function Badge({ variant = "default", className, ...props }: BadgeProps) {
  // Map variants to HeroUI Chip variants
  const heroUIVariant =
    variant === "destructive" ? "secondary" :
      variant === "secondary" ? "soft" :
        variant === "outline" ? "tertiary" :
          "primary"

  return (
    <HeroUIChip
      variant={heroUIVariant}
      className={cn(
        "border rounded-sm",
        variant === "default" && "border-transparent bg-foreground text-background",
        variant === "secondary" && "border-transparent bg-muted text-foreground",
        variant === "outline" && "border-border text-foreground bg-transparent",
        variant === "destructive" && "border-transparent bg-red-500 text-white",
        className
      )}
      {...props}
    />
  )
}

export { Badge }
