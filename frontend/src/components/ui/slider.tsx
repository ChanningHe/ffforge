// Modern Slider component
import { cn } from '@/lib/utils'

interface SliderProps {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  className?: string
}

export function Slider({ value, onChange, min, max, step = 1, className }: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div className={cn('relative', className)}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider-input w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${percentage}%, hsl(var(--muted)) ${percentage}%, hsl(var(--muted)) 100%)`
        }}
      />
      <style>{`
        .slider-input::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: hsl(var(--primary));
          cursor: pointer;
          transition: all 0.15s ease;
          border: 2px solid hsl(var(--background));
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }
        
        .slider-input::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }
        
        .slider-input::-webkit-slider-thumb:active {
          transform: scale(1.05);
        }
        
        .slider-input::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: hsl(var(--primary));
          cursor: pointer;
          transition: all 0.15s ease;
          border: 2px solid hsl(var(--background));
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }
        
        .slider-input::-moz-range-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }
        
        .slider-input::-moz-range-thumb:active {
          transform: scale(1.05);
        }
        
        .slider-input:focus {
          outline: none;
        }
        
        .slider-input:focus-visible::-webkit-slider-thumb {
          ring: 2px solid hsl(var(--ring));
          ring-offset: 2px;
        }
        
        .slider-input:focus-visible::-moz-range-thumb {
          ring: 2px solid hsl(var(--ring));
          ring-offset: 2px;
        }
      `}</style>
    </div>
  )
}

