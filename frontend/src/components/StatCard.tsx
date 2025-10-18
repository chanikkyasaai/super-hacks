import { StatCardProps } from "@/types/dashboard";
import { Card } from "@/components/ui/card";

const StatCard = ({ title, value, subtitle }: StatCardProps) => {
  return (
    <Card className="p-6 hover:shadow-lg transition-shadow duration-200">
      <div className="flex flex-col space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </h3>
        <p className="text-4xl font-bold text-foreground">
          {value}
        </p>
        <p className="text-sm text-muted-foreground">
          {subtitle}
        </p>
      </div>
    </Card>
  );
};

export default StatCard;
