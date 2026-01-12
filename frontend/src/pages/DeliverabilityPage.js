import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Shield, AlertTriangle } from 'lucide-react';

export default function DeliverabilityPage() {
  return (
    <div data-testid="deliverability-page" className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-green-600" />
          <h1 className="text-3xl font-bold text-slate-900">Deliverability Control</h1>
        </div>
        <p className="text-slate-600">Spam risk monitoring and ISP health tracking</p>
      </div>

      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle>System Protection Active</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-900">Auto-Pause Protection</p>
                <p className="text-sm text-slate-600">System automatically pauses domains when bounce rate exceeds 4% or spam complaints exceed 0.2%</p>
              </div>
            </div>
            <div className="text-sm text-slate-500 mt-4">
              Advanced deliverability monitoring, blacklist checks, and ISP health indicators coming soon
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
