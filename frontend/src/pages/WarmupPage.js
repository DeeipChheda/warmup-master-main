import { useState, useEffect } from 'react';
import { api } from '../App';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Flame, AlertTriangle, CheckCircle, TrendingUp, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export default function WarmupPage() {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDomains();
  }, []);

  const loadDomains = async () => {
    try {
      const res = await api.get('/domains');
      setDomains(res.data);
    } catch (error) {
      console.error('Error loading domains:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWarmupStatus = (domain) => {
    if (domain.warmup_completed) return 'completed';
    if (domain.is_paused) return 'paused';
    return 'active';
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Active' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
      paused: { bg: 'bg-red-100', text: 'text-red-800', label: 'Paused' }
    };
    const variant = variants[status];
    return <Badge className={`${variant.bg} ${variant.text}`}>{variant.label}</Badge>;
  };

  const calculateDailyIncrease = (day) => {
    return 10 + (day * 5);
  };

  const domainsInWarmup = domains.filter(d => !d.warmup_completed);
  const completedDomains = domains.filter(d => d.warmup_completed);

  if (loading) {
    return <div data-testid="warmup-loading" className="p-6">Loading...</div>;
  }

  return (
    <div data-testid="warmup-page" className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Flame className="w-8 h-8 text-orange-600" />
          <h1 className="text-3xl font-bold text-slate-900">Warm-Up Center</h1>
        </div>
        <p className="text-slate-600">15-day mandatory warm-up management for all domains</p>
      </div>

      {domains.length === 0 && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>No domains added yet.</strong> Add your first domain to start the warm-up process.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Stats */}
      {domains.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">In Warmup</p>
                  <p className="text-3xl font-bold text-slate-900">{domainsInWarmup.length}</p>
                </div>
                <Flame className="w-10 h-10 text-orange-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Completed</p>
                  <p className="text-3xl font-bold text-slate-900">{completedDomains.length}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Avg Progress</p>
                  <p className="text-3xl font-bold text-slate-900">
                    {domains.length > 0 ? Math.round((domains.reduce((sum, d) => sum + d.warmup_day, 0) / domains.length / 15) * 100) : 0}%
                  </p>
                </div>
                <TrendingUp className="w-10 h-10 text-blue-300" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active Warmup Domains */}
      {domainsInWarmup.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-600" />
              Active Warmup Processes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {domainsInWarmup.map((domain) => {
              const status = getWarmupStatus(domain);
              const daysRemaining = 15 - domain.warmup_day;
              const progressPercent = (domain.warmup_day / 15) * 100;

              return (
                <div key={domain.id} data-testid={`warmup-domain-${domain.id}`} className="p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">{domain.domain}</h3>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(status)}
                        <span className="text-sm text-slate-600 capitalize">{domain.mode.replace('_', ' ')}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-orange-600">Day {domain.warmup_day}/15</div>
                      <div className="text-xs text-slate-500">{daysRemaining} days remaining</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-slate-600">Warmup Progress</span>
                      <span className="font-medium text-slate-900">{Math.round(progressPercent)}%</span>
                    </div>
                    <Progress value={progressPercent} className="h-3" />
                  </div>

                  {/* Daily Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <div className="text-xs text-slate-600 mb-1">Today's Limit</div>
                      <div className="text-lg font-bold text-slate-900">{domain.daily_limit}</div>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <div className="text-xs text-slate-600 mb-1">Sent Today</div>
                      <div className="text-lg font-bold text-blue-600">{domain.sent_today}</div>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <div className="text-xs text-slate-600 mb-1">Tomorrow</div>
                      <div className="text-lg font-bold text-green-600">{calculateDailyIncrease(domain.warmup_day + 1)}</div>
                    </div>
                  </div>

                  {/* Health Score */}
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-white rounded-lg border border-slate-100">
                    <span className="text-sm font-medium text-slate-700">Domain Health Score</span>
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-bold" style={{ color: domain.health_score >= 80 ? '#22c55e' : domain.health_score >= 60 ? '#f59e0b' : '#ef4444' }}>
                        {domain.health_score}
                      </div>
                      <div className="text-xs text-slate-500">/100</div>
                    </div>
                  </div>

                  {/* Pause Warning */}
                  {domain.is_paused && (
                    <Alert className="mt-3 bg-red-50 border-red-200">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        <strong>Warmup Paused:</strong> {domain.pause_reason}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Success Message */}
                  {domain.warmup_day >= 10 && !domain.is_paused && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-800">
                        <CheckCircle className="w-4 h-4 inline mr-1" />
                        <strong>Great progress!</strong> You're {15 - domain.warmup_day} days away from full sending capacity.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Completed Warmups */}
      {completedDomains.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Completed Warmups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedDomains.map((domain) => (
                <div key={domain.id} className="p-4 border border-green-200 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-slate-900">{domain.domain}</h3>
                    <Badge className="bg-green-100 text-green-800">Ready</Badge>
                  </div>
                  <div className="text-sm text-slate-600 mb-2">Daily Limit: {domain.daily_limit} emails</div>
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle className="w-4 h-4" />
                    <span>Fully warmed up • Full sending enabled</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warmup Best Practices */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Warmup Best Practices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-blue-800">
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p><strong>Daily progression:</strong> Send limits increase gradually over 15 days to build sender reputation</p>
          </div>
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p><strong>Auto-pause protection:</strong> System automatically pauses if bounce rate exceeds 4% or spam complaints exceed 0.2%</p>
          </div>
          <div className="flex items-start gap-2">
            <TrendingUp className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p><strong>Human-like sending:</strong> Emails are sent with 7-45 second delays to mimic natural behavior</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
