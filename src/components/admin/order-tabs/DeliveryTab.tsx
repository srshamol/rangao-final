import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, RotateCcw, Phone, Star } from "lucide-react";

interface Props {
  order: any;
  onStatusChange: (status: string) => void;
}

export default function OrderDeliveryTab({ order, onStatusChange }: Props) {
  const [failReason, setFailReason] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");

  const isDelivered = order.order_status === "delivered";

  return (
    <div className="space-y-4 mt-4">
      {isDelivered ? (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" /> ডেলিভারি সফল!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>ডেলিভারি তারিখ:</strong> {new Date(order.updated_at).toLocaleString("bn-BD")}</p>
            <p><strong>রিসিভার:</strong> {order.customer_name}</p>
            <div className="flex items-center gap-1">
              <strong>রেটিং:</strong>
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} className={`h-4 w-4 ${i <= 4 ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> ডেলিভারি কনফার্ম করুন
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button className="gap-1.5" onClick={() => onStatusChange("delivered")}>
                <CheckCircle className="h-4 w-4" /> ডেলিভারি সম্পন্ন
              </Button>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-red-600">
                <XCircle className="h-4 w-4" /> ডেলিভারি ব্যর্থ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">ব্যর্থতার কারণ</Label>
                <Select value={failReason} onValueChange={setFailReason}>
                  <SelectTrigger><SelectValue placeholder="কারণ সিলেক্ট করুন" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_home">গ্রাহক বাড়িতে ছিলেন না</SelectItem>
                    <SelectItem value="wrong_address">ভুল ঠিকানা</SelectItem>
                    <SelectItem value="phone_off">ফোন বন্ধ</SelectItem>
                    <SelectItem value="refused">গ্রাহক নিতে অস্বীকার করেছেন</SelectItem>
                    <SelectItem value="other">অন্যান্য</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">রি-ডেলিভারি তারিখ</Label>
                <Input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5" /> রি-শিডিউল
                </Button>
                <a href={`tel:${order.customer_phone}`}>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> কাস্টমারকে কল
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
