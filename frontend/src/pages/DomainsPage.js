import { useState, useEffect } from 'react';
import { api } from '../App';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Plus, Shield, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function DomainsPage({ user }) {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ domain: '', mode: 'cold_outreach' });

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

  const handleAddDomain = async (e) => {
    e.preventDefault();
    try {
      await api.post('/domains', formData);
      toast.success('Domain added successfully');
      setDialogOpen(false);
      setFormData({ domain: '', mode: 'cold_outreach' });
      loadDomains();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add domain');
    }
  };

  const handleValidate = async (domainId) => {
    try {
      await api.post(`/domains/${domainId}/validate`);
      toast.success('Domain validated successfully');
      loadDomains();
    } catch (error) {
      toast.error('Validation failed');
    }
  };

  const getPlanLimits = (plan) => {
    const limits = {
      free: { max: 1, daily: 20 },
      premium: { max: 3, daily: 150 },
      pro: { max: 10, daily: 300 },
      enterprise: { max: 50, daily: 1000 }
    };
    return limits[plan] || limits.free;
  };

  const planLimits = getPlanLimits(user.plan);

  if (loading) {
    return <div data-testid="domains-loading" className="p-6">Loading...</div>;
  }

  return (
    <div data-testid="domains-page" className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Domains</h1>
          <p className="text-slate-600">
            {domains.length} of {planLimits.max} domains used
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-domain-button" className="bg-slate-900 hover:bg-slate-800">
              <Plus className="w-4 h-4 mr-2" />
              Add Domain
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="add-domain-dialog">
            <DialogHeader>
              <DialogTitle>Add New Domain</DialogTitle>
              <DialogDescription>
                Add a domain to start the mandatory 15-day warm-up process.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddDomain}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="domain">Domain</Label>
                  <Input
                    id="domain"
                    data-testid="domain-input"
                    placeholder="mail.yourcompany.com"
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mode">Sending Mode</Label>
                  <Select
                    value={formData.mode}
                    onValueChange={(value) => setFormData({ ...formData, mode: value })}
                  >
                    <SelectTrigger data-testid="mode-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cold_outreach">Cold Outreach</SelectItem>
                      {(user.plan === 'premium' || user.plan === 'pro' || user.plan === 'enterprise') && (
                        <SelectItem value="founder_outbound">Founder Outbound</SelectItem>
                      )}
                      {(user.plan === 'pro' || user.plan === 'enterprise') && (
                        <SelectItem value="newsletter">Newsletter</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-sm text-amber-800">
                    All domains must complete a 15-day warm-up period before full sending capabilities are enabled.
                  </p>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button data-testid="submit-domain-button" type="submit" className="bg-slate-900 hover:bg-slate-800">
                  Add Domain
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {domains.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No domains added</h3>
              <p className="text-slate-600 mb-4">Add your first domain to begin warming up</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {domains.map((domain) => (
            <Card key={domain.id} data-testid={`domain-card-${domain.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{domain.domain}</CardTitle>
                    <Badge className="mt-2 capitalize">
                      {domain.mode.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-slate-900">{domain.health_score}</div>
                    <div className="text-xs text-slate-500">Health</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-600">Warmup Progress</span>
                    <span className="font-medium">
                      {domain.warmup_completed ? (
                        <Badge className="bg-green-100 text-green-800">Completed</Badge>
                      ) : (
                        <span>Day {domain.warmup_day} / 15</span>
                      )}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-slate-900 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((domain.warmup_day / 15) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-600">Today's Usage</span>
                    <span className="font-medium">{domain.sent_today} / {domain.daily_limit}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(domain.sent_today / domain.daily_limit) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-700">DNS Configuration</span>
                    <Button
                      data-testid={`validate-button-${domain.id}`}
                      size="sm"
                      variant="outline"
                      onClick={() => handleValidate(domain.id)}
                    >
                      Validate
                    </Button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">SPF Record</span>
                      {domain.spf_valid ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">DKIM Record</span>
                      {domain.dkim_valid ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">DMARC Record</span>
                      {domain.dmarc_valid ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>
                </div>

                {domain.is_paused && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-900">Domain Paused</p>
                        <p className="text-xs text-red-700 mt-1">{domain.pause_reason}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
