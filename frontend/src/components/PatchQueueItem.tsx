import { PatchItem } from "@/types/dashboard";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

const PatchQueueItem = ({ patch }: { patch: PatchItem }) => {
  const getSeverityColor = (severity: PatchItem['severity']) => {
    const colors = {
      CRITICAL: 'bg-severity-critical text-white',
      HIGH: 'bg-severity-high text-white',
      MEDIUM: 'bg-severity-medium text-white',
      LOW: 'bg-severity-low text-white',
    };
    return colors[severity];
  };

  return (
    <Link 
      to={`/sandbox/${patch.id}`}
      className="flex items-center justify-between p-4 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors group"
    >
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-muted-foreground font-medium">
            {patch.id}
          </span>
          <Badge className={getSeverityColor(patch.severity)}>
            {patch.severity}
          </Badge>
        </div>
        <p className="text-sm text-foreground">
          {patch.description}
        </p>
      </div>
      <div className="ml-4 flex items-center gap-3">
        <span className="text-lg font-semibold text-primary">
          {patch.impactScore}
        </span>
        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </Link>
  );
};

export default PatchQueueItem;
