import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Package, CheckCircle, XCircle, BarChart3 } from "lucide-react";

interface CourierEntry {
  name: string;
  logo?: string;
  total_parcel: number;
  success_parcel: number;
  cancelled_parcel: number;
  success_ratio: number;
}

interface CourierResultCardsProps {
  data: any; // raw API response from courier-check
}

function getRatioColor(ratio: number) {
  if (ratio >= 80) return "text-green-600";
  if (ratio >= 50) return "text-yellow-600";
  return "text-red-500";
}

function getRatioBarClass(ratio: number) {
  if (ratio >= 80) return "[&>div]:bg-green-500";
  if (ratio >= 50) return "[&>div]:bg-yellow-500";
  return "[&>div]:bg-red-500";
}

export default function CourierResultCards({ data }: CourierResultCardsProps) {
  // Handle the API response: data is the full response, courierData/data is nested
  let courierObj = data?.courierData || data?.data;

  // Robust Fallback: If it's a direct BDCourier response containing root-level metrics
  if (!courierObj && data && (data.total_orders !== undefined || data.total_parcel !== undefined || data.success_ratio !== undefined)) {
    courierObj = {
      summary: {
        name: "BDCourier",
        total_parcel: data.total_orders ?? data.total_parcel ?? 0,
        success_parcel: data.successful_orders ?? data.success_parcel ?? 0,
        cancelled_parcel: data.returned_orders ?? data.cancelled_parcel ?? 0,
        success_ratio: data.success_ratio ?? 0,
      }
    };
  }

  if (!courierObj) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          {data?.message || data?.error || data?.rawText || "কোনো কুরিয়ার ডেটা পাওয়া যায়নি।"}
        </p>
        {data && (
          <pre className="text-[10px] bg-muted p-2 rounded overflow-auto max-w-full font-mono text-muted-foreground">
            Raw Response: {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    );
  }

  const summary = courierObj.summary as CourierEntry | undefined;
  const courierKeys = Object.keys(courierObj).filter((k) => k !== "summary");

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      {summary && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h4 className="font-semibold text-sm">সামারি</h4>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{summary.total_parcel}</p>
                <p className="text-xs text-muted-foreground">মোট পার্সেল</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{summary.success_parcel}</p>
                <p className="text-xs text-muted-foreground">সফল</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-500">{summary.cancelled_parcel}</p>
                <p className="text-xs text-muted-foreground">ক্যান্সেল</p>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span>সাকসেস রেট</span>
                <span className={`font-bold ${getRatioColor(summary.success_ratio)}`}>{summary.success_ratio}%</span>
              </div>
              <Progress value={summary.success_ratio} className={`h-2 ${getRatioBarClass(summary.success_ratio)}`} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Courier Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {courierKeys.map((key) => {
          const courier = courierObj[key] as CourierEntry;
          if (!courier || typeof courier !== "object" || !courier.name) return null;

          return (
            <Card key={key} className="overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  {courier.logo ? (
                    <img src={courier.logo} alt={courier.name} className="h-6 w-6 rounded object-contain" />
                  ) : (
                    <Package className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className="font-medium text-sm">{courier.name}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs mb-2">
                  <div className="bg-muted/50 rounded p-1.5">
                    <p className="font-bold text-sm">{courier.total_parcel}</p>
                    <p className="text-muted-foreground">মোট</p>
                  </div>
                  <div className="bg-muted/50 rounded p-1.5">
                    <div className="flex items-center justify-center gap-0.5">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <p className="font-bold text-sm">{courier.success_parcel}</p>
                    </div>
                    <p className="text-muted-foreground">সফল</p>
                  </div>
                  <div className="bg-muted/50 rounded p-1.5">
                    <div className="flex items-center justify-center gap-0.5">
                      <XCircle className="h-3 w-3 text-red-400" />
                      <p className="font-bold text-sm">{courier.cancelled_parcel}</p>
                    </div>
                    <p className="text-muted-foreground">ক্যান্সেল</p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">সাকসেস</span>
                    <span className={`font-semibold ${getRatioColor(courier.success_ratio)}`}>{courier.success_ratio}%</span>
                  </div>
                  <Progress value={courier.success_ratio} className={`h-1.5 ${getRatioBarClass(courier.success_ratio)}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
