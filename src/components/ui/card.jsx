import { cn } from "../../lib/utils.js"

function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        "rounded-2xl border shadow-sm transition-colors duration-300",
        className
      )}
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }) {
  return (
    <h3
      className={cn("text-2xl font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }) {
  return (
    <p
      className={cn("text-sm text-[#999999]", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }) {
  return (
    <div className={cn("p-6 pt-0", className)} {...props} />
  )
}

export { Card, CardHeader, CardContent, CardTitle, CardDescription }
