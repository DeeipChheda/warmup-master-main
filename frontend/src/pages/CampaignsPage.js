import { useState, useEffect } from 'react';
import { api } from '../App';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Progress } from '../components/ui/progress';
import { toast } from 'sonner';
import { Plus, Send, Mail, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Sparkles } from 'lucide-react';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [domains, setDomains] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [spamScore, setSpamScore] = useState(null);
  const [analyzingSpam, setAnalyzingSpam] = useState(false);
  const [formData, setFormData] = useState({
    domain_id: '',
    name: '',
    subject: '',
    body: '',
    recipients: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [campaignsRes, domainsRes, contactsRes] = await Promise.all([
        api.get('/campaigns'),
        api.get('/domains'),
        api.get('/contacts')
      ]);
      setCampaigns(campaignsRes.data);
      setDomains(domainsRes.data);
      setContacts(contactsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeSpamScore = async () => {
    if (!formData.subject || !formData.body) {
      toast.error('Please add subject and body first');
      return;
    }

    setAnalyzingSpam(true);
    try {
      const domain = domains.find(d => d.id === formData.domain_id);
      const res = await api.post('/spam-score', {
        subject: formData.subject,
        body: formData.body,
        mode: domain?.mode || 'cold_outreach'
      });
      setSpamScore(res.data);
      toast.success('Spam analysis complete!');
    } catch (error) {
      toast.error('Failed to analyze spam score');
    } finally {
      setAnalyzingSpam(false);
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    try {
      const recipientEmails = formData.recipients
        .split(',')
        .map(email => email.trim())
        .filter(email => email);
      
      await api.post('/campaigns', {
        ...formData,
        recipients: recipientEmails
      });
      toast.success('Campaign created successfully');
      setDialogOpen(false);
      setFormData({ domain_id: '', name: '', subject: '', body: '', recipients: [] });
      setSpamScore(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create campaign');
    }
  };

  const handleSendCampaign = async (campaignId) => {
    try {
      await api.post(`/campaigns/${campaignId}/send`);
      toast.success('Campaign sent successfully');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send campaign');
    }
  };

  const getRiskBadge = (riskLevel) => {
    const variants = {
      low: { bg: 'bg-green-100', text: 'text-green-800', label: 'Low Risk' },
      medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Medium Risk' },
      high: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'High Risk' },
      critical: { bg: 'bg-red-100', text: 'text-red-800', label: 'Critical Risk' }
    };
    const variant = variants[riskLevel] || variants.medium;
    return <Badge className={`${variant.bg} ${variant.text}`}>{variant.label}</Badge>;
  };

  const getStatusBadge = (status) => {
    const variants = {
      draft: 'bg-slate-100 text-slate-800',
      sending: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      paused: 'bg-amber-100 text-amber-800'
    };
    return <Badge className={variants[status] || ''}>{status}</Badge>;
  };

  if (loading) {
    return <div data-testid="campaigns-loading" className="p-6">Loading...</div>;
  }

  return (
    <div data-testid="campaigns-page" className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Campaigns</h1>
          <p className="text-slate-600">{campaigns.length} campaigns created</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="create-campaign-button" className="bg-slate-900 hover:bg-slate-800">
              <Plus className="w-4 h-4 mr-2" />
              Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="create-campaign-dialog" className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Campaign</DialogTitle>
              <DialogDescription>
                Create an email campaign with deliverability protection.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCampaign}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="domain_id">Select Domain *</Label>
                  <Select
                    value={formData.domain_id}
                    onValueChange={(value) => setFormData({ ...formData, domain_id: value })}
                    required
                  >
                    <SelectTrigger data-testid="domain-select">
                      <SelectValue placeholder="Choose a domain" />
                    </SelectTrigger>
                    <SelectContent>
                      {domains.map((domain) => (
                        <SelectItem key={domain.id} value={domain.id} disabled={domain.is_paused}>
                          {domain.domain} {domain.is_paused && '(Paused)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Campaign Name *</Label>
                  <Input
                    id="name"
                    data-testid="campaign-name-input"
                    placeholder="Q1 Outreach Campaign"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject Line *</Label>
                  <Input
                    id="subject"
                    data-testid="subject-input"
                    placeholder="Quick question about your business"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="body">Email Body *</Label>
                  <Textarea
                    id="body"
                    data-testid="body-textarea"
                    placeholder="Hi {{first_name}},\n\nI noticed your company..."
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    rows={6}
                    required
                  />
                </div>

                {/* AI Spam Score Analysis */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      AI Spam Risk Analysis
                    </Label>
                    <Button
                      type="button"
                      data-testid="analyze-spam-button"
                      variant="outline"
                      size="sm"
                      onClick={analyzeSpamScore}
                      disabled={analyzingSpam || !formData.subject || !formData.body}
                    >
                      {analyzingSpam ? 'Analyzing...' : 'Analyze'}
                    </Button>
                  </div>

                  {spamScore && (
                    <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-3xl font-bold text-slate-900">{spamScore.score}</div>
                          <div>
                            <div className="text-xs text-slate-500">Spam Risk Score</div>
                            {getRiskBadge(spamScore.risk_level)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">{spamScore.predicted_inbox_rate}%</div>
                          <div className="text-xs text-slate-500">Inbox Rate</div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-xs text-slate-600 mb-1">Inbox Placement Prediction</div>
                        <Progress value={spamScore.predicted_inbox_rate} className="h-2" />
                      </div>

                      {spamScore.recommendations.length > 0 && (
                        <Alert className="bg-white">
                          <AlertTriangle className="w-4 h-4" />
                          <AlertDescription>
                            <div className="font-semibold mb-2">Recommendations:</div>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                              {spamScore.recommendations.slice(0, 3).map((rec, idx) => (
                                <li key={idx}>{rec}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}

                      {spamScore.risk_level === 'critical' && (
                        <Alert className="bg-red-50 border-red-200">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          <AlertDescription className="text-red-800">
                            <strong>Warning:</strong> This email has a very high spam risk and may damage your sender reputation.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}

                  {!spamScore && (
                    <p className="text-sm text-slate-500 italic">
                      Analyze your email to get AI-powered deliverability insights before sending
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipients">Recipients *</Label>
                  <Textarea
                    id="recipients"
                    data-testid="recipients-textarea"
                    placeholder="email1@company.com, email2@company.com"
                    value={formData.recipients}
                    onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                    rows={3}
                    required
                  />
                  <p className="text-xs text-slate-500">Comma-separated email addresses</p>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    System will enforce daily limits and auto-pause if deliverability risks are detected.
                  </p>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button data-testid="submit-campaign-button" type="submit" className="bg-slate-900 hover:bg-slate-800">
                  Create Campaign
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Mail className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No campaigns yet</h3>
              <p className="text-slate-600 mb-4">Create your first campaign to start sending</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} data-testid={`campaign-card-${campaign.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{campaign.name}</CardTitle>
                    <p className="text-sm text-slate-600 mt-1">{campaign.subject}</p>
                  </div>
                  {getStatusBadge(campaign.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-slate-900">{campaign.sent_count}</div>
                    <div className="text-xs text-slate-500">Total Sent</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{campaign.delivered_count}</div>
                    <div className="text-xs text-slate-500">Delivered</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    <span className="text-slate-600">Bounced:</span>
                    <span className="font-medium">{campaign.bounce_count}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    <span className="text-slate-600">Replies:</span>
                    <span className="font-medium">{campaign.reply_count}</span>
                  </div>
                </div>

                {campaign.status === 'draft' && (
                  <Button
                    data-testid={`send-campaign-button-${campaign.id}`}
                    onClick={() => handleSendCampaign(campaign.id)}
                    className="w-full bg-slate-900 hover:bg-slate-800"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Campaign
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
