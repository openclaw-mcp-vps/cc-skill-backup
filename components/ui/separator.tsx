import * as React from "react";
import { cn } from "@/lib/utils";

function Separator({ className, ...props }: React.ComponentProps<"hr">) {
  return <hr className={cn("border-zinc-800", className)} {...props} />;
}

export { Separator };
