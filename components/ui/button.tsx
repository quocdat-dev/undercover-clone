'use client'

import * as React from "react"
import { Button as HeroUIButton, ButtonProps as HeroUIButtonProps } from '@heroui/react'
import { cn } from "@/lib/utils"

export interface ButtonProps extends Omit<HeroUIButtonProps, 'onPress' | 'onClick' | 'variant' | 'size' | 'isIconOnly'> {
  variant?: "default" | "primary" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  onClick?: HeroUIButtonProps["onPress"]
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ onClick, variant = "default", size = "default", className, ...props }, ref) => {
    // Map variants to HeroUI v3 variants
    const heroUIVariant =
      variant === "destructive" ? "danger" :
        variant === "outline" ? "outline" :
          variant === "secondary" ? "secondary" :
            variant === "ghost" ? "ghost" :
              variant === "link" ? "tertiary" :
                "tertiary"

    // Map sizes to HeroUI sizes
    const heroUISize =
      size === "sm" ? "sm" :
        size === "lg" ? "lg" :
          size === "icon" ? "sm" :
            "md"

    const handlePress = React.useCallback((e: any) => {
      if (onClick) {
        onClick(e as any)
      }
    }, [onClick])

    return (
      <HeroUIButton
        ref={ref}
        variant={heroUIVariant}
        size={heroUISize}
        isIconOnly={size === "icon"}
        onPress={onClick ? handlePress : undefined}
        className={cn(
          "font-medium transition-colors border rounded-sm",
          (variant === "primary" || variant === "default") && "bg-foreground text-background hover:bg-foreground/90 border-transparent",
          variant === "secondary" && "bg-muted text-foreground hover:bg-notion-hover dark:hover:bg-notion-hover-dark border-transparent",
          variant === "outline" && "bg-transparent text-foreground hover:bg-notion-hover dark:hover:bg-notion-hover-dark border-border",
          variant === "ghost" && "bg-transparent text-foreground hover:bg-notion-hover dark:hover:bg-notion-hover-dark border-transparent",
          variant === "destructive" && "bg-red-500 text-white hover:bg-red-600 border-transparent",
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
