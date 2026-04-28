import { AlertTriangle } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message?: string;
  action?: React.ReactNode;
  className?: string;
}

export function ErrorState({
  title,
  message,
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center gap-4 py-20 text-center ${className || ""}`}
    >
      <AlertTriangle className="h-12 w-12 text-destructive" />
      {title && <h3 className="text-lg font-semibold">{title}</h3>}
      {message && <p className="text-muted-foreground max-w-md">{message}</p>}
      {action}
    </div>
  );
}
