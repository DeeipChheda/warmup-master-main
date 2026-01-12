import { Card, CardContent } from '../components/ui/card';
import { BarChart3 } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div data-testid="analytics-page" className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Analytics</h1>
        <p className="text-slate-600">Campaign performance and deliverability metrics</p>
      </div>

      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <BarChart3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Performance Metrics</h3>
            <p className="text-slate-600 mb-4">Opens, clicks, replies, inbox vs spam estimates</p>
            <p className="text-sm text-slate-500">Advanced analytics coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
