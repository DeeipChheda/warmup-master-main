import { useState, useEffect } from 'react';
import { api } from '../App';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Shield, AlertTriangle, CheckCircle, TrendingDown, Activity, Mail } from 'lucide-react';

export default function DeliverabilityPage() {
  const [domains, setDomains] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [domainsRes, campaignsRes] = await Promise.all([
        api.get('/domains'),
        api.get('/campaigns')
      ]);
      setDomains(domainsRes.data);
      setCampaigns(campaignsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (domain) => {
    const domainCampaigns = campaigns.filter(c => c.domain_id === domain.id);
    const totalSent = domainCampaigns.reduce((sum, c) => sum + c.sent_count, 0);
    const totalBounced = domainCampaigns.reduce((sum, c) => sum + c.bounce_count, 0);
    const totalSpam = domainCampaigns.reduce((sum, c) => sum + c.spam_count, 0);

    return {
      total_sent: totalSent,
      bounce_rate: totalSent > 0 ? ((totalBounced / totalSent) * 100).toFixed(2) : 0,
      spam_rate: totalSent > 0 ? ((totalSpam / totalSent) * 100).toFixed(3) : 0,
      delivery_rate: totalSent > 0 ? (((totalSent - totalBounced - totalSpam) / totalSent) * 100).toFixed(1) : 100
    };
  };

  const getHealthStatus = (healthScore) => {
    if (healthScore >= 90) return { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-100' };
    if (healthScore >= 75) return { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (healthScore >= 60) return { label: 'Fair', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { label: 'Poor', color: 'text-red-600', bg: 'bg-red-100' };
  };

  if (loading) {
    return <div data-testid="deliverability-loading" className="p-6">Loading...</div>;
  }

  const totalSent = campaigns.reduce((sum, c) => sum + c.sent_count, 0);
  const pausedDomains = domains.filter(d => d.is_paused).length;

  return (
    <div data-testid="deliverability-page" className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-green-600" />
          <h1 className="text-3xl font-bold text-slate-900">Deliverability Control</h1>
        </div>
        <p className="text-slate-600">Real-time monitoring and auto-pause protection</p>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">System Status</p>
                <p className="text-2xl font-bold text-green-600">Protected</p>
              </div>
              <Shield className="w-10 h-10 text-green-300" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Sent</p>
                <p className="text-2xl font-bold text-slate-900">{totalSent}</p>
              </div>
              <Mail className="w-10 h-10 text-blue-300" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-slate-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Active Domains</p>
                <p className="text-2xl font-bold text-slate-900">{domains.length - pausedDomains}</p>
              </div>
              <Activity className="w-10 h-10 text-slate-300" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Paused</p>
                <p className="text-2xl font-bold text-red-600">{pausedDomains}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-red-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Protection Rules */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle>Auto-Pause Protection Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-900">Bounce Rate Monitor</p>
                <p className="text-sm text-slate-600">System auto-pauses if bounce rate exceeds 4%</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-900">Spam Complaint Monitor</p>
                <p className="text-sm text-slate-600">System auto-pauses if spam rate exceeds 0.2%</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-900">Health Score Tracking</p>
                <p className="text-sm text-slate-600">Real-time domain reputation monitoring (0-100)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Domain Health Status */}
      {domains.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Domain Health Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {domains.map((domain) => {
                const metrics = calculateMetrics(domain);
                const healthStatus = getHealthStatus(domain.health_score);
                const bounceWarning = parseFloat(metrics.bounce_rate) > 3;
                const spamWarning = parseFloat(metrics.spam_rate) > 0.15;

                return (
                  <div key={domain.id} data-testid={`domain-health-${domain.id}`} className="p-4 border border-slate-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-slate-900 mb-1">{domain.domain}</h3>
                        <Badge className={`${healthStatus.bg} ${healthStatus.color}`}>{healthStatus.label}</Badge>
                      </div>
                      <div className="text-right">
                        <div className={`text-3xl font-bold ${healthStatus.color}`}>{domain.health_score}</div>
                        <div className="text-xs text-slate-500">Health Score</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mb-3">
                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <div className="text-xs text-slate-600 mb-1">Total Sent</div>
                        <div className="text-lg font-bold text-slate-900">{metrics.total_sent}</div>
                      </div>
                      <div className={`text-center p-3 rounded-lg ${bounceWarning ? 'bg-red-50' : 'bg-slate-50'}`}>
                        <div className="text-xs text-slate-600 mb-1">Bounce Rate</div>
                        <div className={`text-lg font-bold ${bounceWarning ? 'text-red-600' : 'text-slate-900'}`}>
                          {metrics.bounce_rate}%
                        </div>
                      </div>
                      <div className={`text-center p-3 rounded-lg ${spamWarning ? 'bg-red-50' : 'bg-slate-50'}`}>
                        <div className="text-xs text-slate-600 mb-1">Spam Rate</div>
                        <div className={`text-lg font-bold ${spamWarning ? 'text-red-600' : 'text-slate-900'}`}>
                          {metrics.spam_rate}%
                        </div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-xs text-slate-600 mb-1">Delivery Rate</div>
                        <div className="text-lg font-bold text-green-600">{metrics.delivery_rate}%</div>
                      </div>
                    </div>

                    {domain.is_paused && (
                      <Alert className="bg-red-50 border-red-200">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                          <strong>PAUSED:</strong> {domain.pause_reason}
                        </AlertDescription>
                      </Alert>
                    )}

                    {(bounceWarning || spamWarning) && !domain.is_paused && (
                      <Alert className="bg-amber-50 border-amber-200">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <AlertDescription className="text-amber-800">
                          <strong>Warning:</strong> Approaching auto-pause thresholds. Review email quality.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {domains.length === 0 && (
        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            No domains added yet. Add domains to start monitoring deliverability.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
