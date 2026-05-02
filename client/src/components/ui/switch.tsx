import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  return (
    <SwitchPrimitives.Root
      dir="ltr"
      className={cn(
        "peer inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-inner transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-600",
        className
      )}
      {...props}
      ref={ref}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform",
          isRTL
            ? "data-[state=unchecked]:translate-x-5 data-[state=checked]:translate-x-0.5"
            : "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0.5"
        )}
      />
    </SwitchPrimitives.Root>
  );
})
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
