import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
}

export default function StatsCard({ title, value, subtitle, icon: Icon, trend, trendUp }: StatsCardProps) {
  return (
    <Card className="border-border/40 shadow-premium transition-all duration-300 hover:shadow-card-hover">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">{title}</p>
            <p className="mt-2 font-display text-3xl font-extrabold text-foreground">{value}</p>
            {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
            {trend && (
              <p className={`mt-1.5 text-xs font-semibold ${trendUp ? "text-success" : "text-destructive"}`}>
                {trend}
              </p>
            )}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10">
            <Icon className="h-6 w-6 text-accent" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
