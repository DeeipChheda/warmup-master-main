import { Card, CardContent } from '../components/ui/card';

export default function SequencesPage() {
  const config = {
    WarmupPage: { title: 'Warm-Up Center', desc: '15-day warm-up management', icon: 'Flame' },
    SendingAccountsPage: { title: 'Sending Accounts', desc: 'SMTP/API integrations', icon: 'Server' },
    SequencesPage: { title: 'Sequences', desc: 'Multi-step automation', icon: 'Zap' }
  };
  const info = config['SequencesPage'];
  
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">{info.title}</h1>
        <p className="text-slate-600">{info.desc}</p>
      </div>
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <p className="text-slate-500">Feature coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
