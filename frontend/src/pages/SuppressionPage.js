import { Card, CardContent } from '../components/ui/card';
import { Ban } from 'lucide-react';

export default function SuppressionPage() {
  return (
    <div data-testid="suppression-page" className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Suppression List</h1>
        <p className="text-slate-600">Global unsubscribes, hard bounces, and spam complaints</p>
      </div>

      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Ban className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Email Suppression</h3>
            <p className="text-slate-600 mb-4">Automatically suppress hard bounces and complaints</p>
            <p className="text-sm text-slate-500">Suppression management coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
