import { Smile, Meh, Frown } from "lucide-react";

interface SentimentIndicatorProps {
  sentiment?: string | null;
}

export function SentimentIndicator({ sentiment }: SentimentIndicatorProps) {
  if (!sentiment) return <span className="text-muted-foreground">-</span>;

  const normalized = sentiment.toLowerCase();

  if (normalized === "positive") {
    return (
      <div className="flex items-center gap-1.5 text-green-600">
        <Smile className="w-4 h-4" />
        <span className="text-sm font-medium">Positive</span>
      </div>
    );
  }

  if (normalized === "negative") {
    return (
      <div className="flex items-center gap-1.5 text-red-600">
        <Frown className="w-4 h-4" />
        <span className="text-sm font-medium">Negative</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-yellow-600">
      <Meh className="w-4 h-4" />
      <span className="text-sm font-medium">Neutral</span>
    </div>
  );
}
