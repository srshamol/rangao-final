import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Pause } from "lucide-react";

interface OrderConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  onConfirm: (note: string) => void;
  onCancel: (note: string) => void;
  onHold: (note: string) => void;
  loading?: boolean;
}

export default function OrderConfirmModal({
  open, onOpenChange, order, onConfirm, onCancel, onHold, loading
}: OrderConfirmModalProps) {
  const [note, setNote] = useState("");

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <CheckCircle className="h-5 w-5 text-primary" />
            অর্ডার কনফার্ম করুন
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
            <p><strong>{order.order_number}</strong> — {order.customer_name}</p>
            <div className="flex items-center gap-1 text-muted-foreground">
              <span>৳{Number(order.total_amount).toLocaleString()}</span>
              <span className="mx-1">•</span>
              <Badge variant="outline" className="text-xs">{order.payment_method}</Badge>
            </div>
          </div>

          <Textarea
            placeholder="নোট (ঐচ্ছিক)..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="text-sm"
          />

          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              className="flex-1 gap-1"
              onClick={() => { onCancel(note); setNote(""); }}
              disabled={loading}
            >
              <XCircle className="h-4 w-4" /> ক্যান্সেল
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1"
              onClick={() => { onHold(note); setNote(""); }}
              disabled={loading}
            >
              <Pause className="h-4 w-4" /> হোল্ড
            </Button>
            <Button
              size="sm"
              className="flex-1 gap-1"
              onClick={() => { onConfirm(note); setNote(""); }}
              disabled={loading}
            >
              <CheckCircle className="h-4 w-4" /> কনফার্ম
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
