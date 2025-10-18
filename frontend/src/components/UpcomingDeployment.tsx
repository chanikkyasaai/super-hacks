import { DeploymentItem } from "@/types/dashboard";
import { Clock } from "lucide-react";

const UpcomingDeployment = ({ deployment }: { deployment: DeploymentItem }) => {
  return (
    <div className="flex items-center justify-between p-4 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors">
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">
          {deployment.title}
        </p>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Clock className="w-4 h-4" />
        <span className="text-sm">
          {deployment.time}
        </span>
      </div>
    </div>
  );
};

export default UpcomingDeployment;
