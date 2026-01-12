import { useState, useEffect } from 'react';
import { api } from '../App';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Activity, Mail, Shield, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, domainsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/domains')
      ]);
      setStats(statsRes.data);
      setDomains(domainsRes.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div data-testid="dashboard-loading" className="p-6">Loading...</div>;
  }

  return (
    <div data-testid="dashboard" className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Dashboard</h1>
        <p className="text-slate-600">Monitor your email deliverability and campaign performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card data-testid="stat-domains" className="border-l-4 border-l-slate-900">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Domains</p>
                <p className="text-3xl font-bold text-slate-900">{stats?.total_domains || 0}</p>
              </div>
              <Shield className="w-10 h-10 text-slate-300" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-campaigns" className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Active Campaigns</p>
                <p className="text-3xl font-bold text-slate-900">{stats?.active_campaigns || 0}</p>
              </div>
              <Activity className="w-10 h-10 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-emails" className="border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Sent Today</p>
                <p className="text-3xl font-bold text-slate-900">{stats?.emails_sent_today || 0}</p>
              </div>
              <Mail className="w-10 h-10 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-warmup" className="border-l-4 border-l-amber-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">In Warmup</p>
                <p className="text-3xl font-bold text-slate-900">{stats?.domains_in_warmup || 0}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-amber-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="domain-health-card">
        <CardHeader>
          <CardTitle>Domain Health Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {domains.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-2">No domains added yet</p>
              <p className="text-sm text-slate-500">Add your first domain to start warming up</p>
            </div>
          ) : (
            <div className="space-y-4">
              {domains.map((domain) => (
                <div key={domain.id} data-testid={`domain-health-${domain.id}`} className="p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">{domain.domain}</h3>
                      <p className="text-sm text-slate-600 capitalize">{domain.mode.replace('_', ' ')}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-slate-900">{domain.health_score}</div>
                      <div className="text-xs text-slate-500">Health Score</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Warmup Progress</span>
                      <span className="font-medium text-slate-900">Day {domain.warmup_day} of 15</span>
                    </div>
                    <Progress value={(domain.warmup_day / 15) * 100} className="h-2" />
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-slate-600">Today's Usage</span>
                    <span className="font-medium text-slate-900">
                      {domain.sent_today} / {domain.daily_limit} emails
                    </span>
                  </div>

                  {domain.is_paused && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-900">Domain Paused</p>
                          <p className="text-xs text-red-700 mt-1">{domain.pause_reason}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {!domain.warmup_completed && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                      <p className="text-xs text-amber-800">
                        Warmup in progress. Features are limited until completion.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
