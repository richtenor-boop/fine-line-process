import { cn } from "@/lib/cn";

export function Alert({
  variant = "error",
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: "error" | "success" }) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "rounded-md border px-3 py-2 text-sm",
        variant === "error" && "border-red-200 bg-red-50 text-red-700",
        variant === "success" && "border-green-200 bg-green-50 text-green-700",
        className,
      )}
      {...props}
    />
  );
}
