'use client'

import * as React from "react"
import { Slider as HeroUISlider, SliderProps as HeroUISliderProps } from '@heroui/react'

export interface SliderProps extends Omit<HeroUISliderProps, 'value' | 'onChange' | 'defaultValue' | 'minValue' | 'maxValue'> {
  value?: number
  onValueChange?: (value: number) => void
  min?: number
  max?: number
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({ value, onValueChange, min, max, className, ...props }, ref) => {
    const handleChange = React.useCallback((newValue: number | number[]) => {
      if (onValueChange) {
        // Handle both single value and array
        const numValue = Array.isArray(newValue) ? newValue[0] : newValue
        onValueChange(numValue)
      }
    }, [onValueChange])

    // Build props object, ensuring controlled/uncontrolled is handled correctly
    const sliderProps: any = {
      ...props,
      minValue: min,
      maxValue: max,
      className,
      onChange: handleChange,
    }

    // Use controlled or uncontrolled based on value prop
    if (value !== undefined) {
      sliderProps.value = value
    }

    return (
      <HeroUISlider ref={ref} {...sliderProps}>
        <HeroUISlider.Track>
          <HeroUISlider.Fill />
          <HeroUISlider.Thumb />
        </HeroUISlider.Track>
      </HeroUISlider>
    )
  }
)
Slider.displayName = "Slider"

export { Slider }
