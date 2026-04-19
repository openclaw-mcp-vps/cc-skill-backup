import * as React from "react";

import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-[#1f406b] bg-[#102440] px-2.5 py-1 text-xs font-semibold tracking-wide text-[#86b6ff]",
        className
      )}
      {...props}
    />
  );
}
