import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { TrendingUp, Check, Lock } from 'lucide-react';

export default function UpgradePage({ user }) {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      features: ['1 domain', '20 emails/day', 'Cold outreach only', 'Basic warmup']
    },
    {
      name: 'Premium',
      price: '$49',
      features: ['3 domains', '150 emails/day/domain', 'Cold + Founder modes', 'Sequences', 'Analytics']
    },
    {
      name: 'Pro',
      price: '$199',
      features: ['10 domains', '300 emails/day/domain', 'All modes', 'AI Assistant', 'Domain Rotation', 'Advanced analytics']
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      features: ['50+ domains', '1000 emails/day/domain', 'Client management', 'Dedicated IPs', 'SLA', 'White-label']
    }
  ];

  return (
    <div data-testid="upgrade-page" className="p-6 space-y-6">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-3">
          <TrendingUp className="w-10 h-10 text-green-600" />
          <h1 className="text-4xl font-bold text-slate-900">Upgrade Your Plan</h1>
        </div>
        <p className="text-lg text-slate-600">
          Scale your deliverability-protected email sending
        </p>
        <Badge className="mt-3 bg-green-100 text-green-800">
          Current: {user?.plan || 'Free'} Plan
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => (
          <Card key={plan.name} className={plan.name.toLowerCase() === user?.plan ? 'border-2 border-green-500' : ''}>
            <CardHeader>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <div className="text-3xl font-bold text-slate-900">{plan.price}</div>
              {plan.price !== 'Custom' && plan.price !== '$0' && (
                <p className="text-sm text-slate-500">/month</p>
              )}
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button 
                className="w-full"
                variant={plan.name.toLowerCase() === user?.plan ? 'outline' : 'default'}
                disabled={plan.name.toLowerCase() === user?.plan}
              >
                {plan.name.toLowerCase() === user?.plan ? 'Current Plan' : 'Upgrade'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-slate-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-slate-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Unlock Advanced Features</h3>
              <p className="text-sm text-slate-600">
                Upgrade to access AI Assistant, Domain Rotation, Client Management, and more.
                All plans include mandatory warm-up and auto-pause protection.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
