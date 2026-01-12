import { useState, useEffect, useCallback } from 'react';
import { api } from '../App';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Slider } from '../components/ui/slider';
import { Progress } from '../components/ui/progress';
import { Separator } from '../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '../components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '../components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { 
  Plus, 
  Server, 
  Mail, 
  MoreVertical, 
  Play, 
  Pause, 
  Trash2, 
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Shield,
  Flame,
  TrendingUp,
  RefreshCw,
  Settings,
  Activity,
  Calendar,
  Clock,
  BarChart3,
  Zap,
  Eye,
  EyeOff,
  Loader2,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Send
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

export default function SendingAccountsPage({ user }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [verifyingId, setVerifyingId] = useState(null);
  const [warmupStats, setWarmupStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const fetchAccounts = useCallback(async () => {
    try {
      const response = await api.get('/sending-accounts');
      setAccounts(response.data);
    } catch (error) {
      toast.error('Failed to load sending accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const fetchWarmupStats = async (accountId) => {
    setLoadingStats(true);
    try {
      const response = await api.get(`/sending-accounts/${accountId}/warmup/stats`);
      setWarmupStats(response.data);
    } catch (error) {
      toast.error('Failed to load warmup stats');
    } finally {
      setLoadingStats(false);
    }
  };

  const handleVerify = async (accountId) => {
    setVerifyingId(accountId);
    try {
      await api.post(`/sending-accounts/${accountId}/verify`);
      toast.success('Account verified successfully');
      fetchAccounts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Verification failed');
    } finally {
      setVerifyingId(null);
    }
  };

  const handlePause = async (accountId) => {
    try {
      await api.post(`/sending-accounts/${accountId}/pause`);
      toast.success('Account paused');
      fetchAccounts();
      if (selectedAccount?.id === accountId) {
        const updated = await api.get(`/sending-accounts/${accountId}`);
        setSelectedAccount(updated.data);
      }
    } catch (error) {
      toast.error('Failed to pause account');
    }
  };

  const handleResume = async (accountId) => {
    try {
      await api.post(`/sending-accounts/${accountId}/resume`);
      toast.success('Account resumed');
      fetchAccounts();
      if (selectedAccount?.id === accountId) {
        const updated = await api.get(`/sending-accounts/${accountId}`);
        setSelectedAccount(updated.data);
      }
    } catch (error) {
      toast.error('Failed to resume account');
    }
  };

  const handleDelete = async (accountId) => {
    try {
      await api.delete(`/sending-accounts/${accountId}`);
      toast.success('Account deleted');
      setDeleteConfirmId(null);
      fetchAccounts();
      if (selectedAccount?.id === accountId) {
        setShowDetailSheet(false);
        setSelectedAccount(null);
      }
    } catch (error) {
      toast.error('Failed to delete account');
    }
  };

  const handleStartWarmup = async (accountId) => {
    try {
      await api.post(`/sending-accounts/${accountId}/warmup/start`);
      toast.success('Warmup started');
      fetchAccounts();
      if (selectedAccount?.id === accountId) {
        const updated = await api.get(`/sending-accounts/${accountId}`);
        setSelectedAccount(updated.data);
        fetchWarmupStats(accountId);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to start warmup');
    }
  };

  const handlePauseWarmup = async (accountId) => {
    try {
      await api.post(`/sending-accounts/${accountId}/warmup/pause`);
      toast.success('Warmup paused');
      fetchAccounts();
      if (selectedAccount?.id === accountId) {
        const updated = await api.get(`/sending-accounts/${accountId}`);
        setSelectedAccount(updated.data);
      }
    } catch (error) {
      toast.error('Failed to pause warmup');
    }
  };

  const openAccountDetail = (account) => {
    setSelectedAccount(account);
    setShowDetailSheet(true);
    fetchWarmupStats(account.id);
  };

  const getProviderIcon = (provider) => {
    switch (provider) {
      case 'gmail':
        return <Mail className="w-4 h-4 text-red-500" />;
      case 'outlook':
        return <Mail className="w-4 h-4 text-blue-500" />;
      default:
        return <Server className="w-4 h-4 text-slate-500" />;
    }
  };

  const getProviderLabel = (provider) => {
    switch (provider) {
      case 'gmail': return 'Google';
      case 'outlook': return 'Microsoft';
      case 'smtp': return 'SMTP';
      default: return provider;
    }
  };

  const getHealthBadge = (status) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Healthy</Badge>;
      case 'risky':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Risky</Badge>;
      case 'critical':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Critical</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getWarmupStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100"><Flame className="w-3 h-3 mr-1" />Active</Badge>;
      case 'paused':
        return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100"><Pause className="w-3 h-3 mr-1" />Paused</Badge>;
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
      default:
        return <Badge variant="outline">Inactive</Badge>;
    }
  };

  // Stats cards
  const totalAccounts = accounts.length;
  const healthyAccounts = accounts.filter(a => a.health_status === 'healthy').length;
  const warmingUp = accounts.filter(a => a.warmup_status === 'active').length;
  const verifiedAccounts = accounts.filter(a => a.is_verified).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Sending Accounts</h1>
          <p className="text-slate-600">Manage your email accounts, warmup, and deliverability settings</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Account
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Accounts</p>
                <p className="text-2xl font-bold text-slate-900">{totalAccounts}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                <Server className="w-5 h-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Healthy</p>
                <p className="text-2xl font-bold text-emerald-600">{healthyAccounts}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Warming Up</p>
                <p className="text-2xl font-bold text-orange-600">{warmingUp}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Flame className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Verified</p>
                <p className="text-2xl font-bold text-blue-600">{verifiedAccounts}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accounts Table */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">All Sending Accounts</CardTitle>
            <Button variant="outline" size="sm" onClick={fetchAccounts} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Server className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-slate-500 mb-4">No sending accounts yet</p>
              <Button onClick={() => setShowAddModal(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Your First Account
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email Address</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Warmup Status</TableHead>
                  <TableHead>Daily Limit</TableHead>
                  <TableHead>Reputation</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Bounce Rate</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow 
                    key={account.id} 
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => openAccountDetail(account)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {account.is_verified ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-slate-300" />
                        )}
                        <span className="font-medium">{account.email}</span>
                        {account.is_paused && (
                          <Badge variant="outline" className="text-xs">Paused</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getProviderIcon(account.provider)}
                        <span>{getProviderLabel(account.provider)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getWarmupStatusBadge(account.warmup_status)}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{account.daily_send_limit}</span>
                      <span className="text-slate-400 text-sm"> /day</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={account.reputation_score} className="w-16 h-2" />
                        <span className="text-sm font-medium">{account.reputation_score}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getHealthBadge(account.health_status)}</TableCell>
                    <TableCell>
                      <span className={account.bounce_rate > 2 ? 'text-red-600 font-medium' : ''}>
                        {account.bounce_rate.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell>
                      {account.last_activity ? (
                        <span className="text-sm text-slate-500">
                          {new Date(account.last_activity).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">Never</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openAccountDetail(account); }}>
                            <Settings className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {!account.is_verified && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleVerify(account.id); }}>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Verify Connection
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {account.is_paused ? (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleResume(account.id); }}>
                              <Play className="w-4 h-4 mr-2" />
                              Resume
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handlePause(account.id); }}>
                              <Pause className="w-4 h-4 mr-2" />
                              Pause
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(account.id); }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Account Modal */}
      <AddAccountModal 
        open={showAddModal} 
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false);
          fetchAccounts();
        }}
      />

      {/* Account Detail Sheet */}
      <AccountDetailSheet
        open={showDetailSheet}
        onClose={() => {
          setShowDetailSheet(false);
          setSelectedAccount(null);
          setWarmupStats(null);
        }}
        account={selectedAccount}
        warmupStats={warmupStats}
        loadingStats={loadingStats}
        onVerify={handleVerify}
        onPause={handlePause}
        onResume={handleResume}
        onDelete={(id) => setDeleteConfirmId(id)}
        onStartWarmup={handleStartWarmup}
        onPauseWarmup={handlePauseWarmup}
        onRefresh={() => {
          if (selectedAccount) {
            fetchWarmupStats(selectedAccount.id);
          }
        }}
        verifyingId={verifyingId}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sending Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this sending account and all associated warmup data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700"
              onClick={() => handleDelete(deleteConfirmId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Add Account Modal Component
function AddAccountModal({ open, onClose, onSuccess }) {
  const [provider, setProvider] = useState('smtp');
  const [email, setEmail] = useState('');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpUseTls, setSmtpUseTls] = useState(true);
  const [warmupEnabled, setWarmupEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const resetForm = () => {
    setProvider('smtp');
    setEmail('');
    setSmtpHost('');
    setSmtpPort('587');
    setSmtpUsername('');
    setSmtpPassword('');
    setSmtpUseTls(true);
    setWarmupEnabled(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        email,
        provider,
        warmup_enabled: warmupEnabled
      };

      if (provider === 'smtp') {
        payload.smtp_host = smtpHost;
        payload.smtp_port = parseInt(smtpPort);
        payload.smtp_username = smtpUsername || email;
        payload.smtp_password = smtpPassword;
        payload.smtp_use_tls = smtpUseTls;
      }

      await api.post('/sending-accounts', payload);
      toast.success('Sending account added successfully');
      resetForm();
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) { resetForm(); onClose(); } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Sending Account</DialogTitle>
          <DialogDescription>
            Connect an email account to send campaigns and enable inbox warmup.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Provider Selection */}
          <div className="space-y-3">
            <Label>Provider</Label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                className={`p-4 rounded-lg border-2 transition-all ${
                  provider === 'gmail' 
                    ? 'border-red-500 bg-red-50' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => setProvider('gmail')}
              >
                <Mail className="w-6 h-6 mx-auto mb-2 text-red-500" />
                <span className="text-sm font-medium">Google</span>
              </button>
              <button
                type="button"
                className={`p-4 rounded-lg border-2 transition-all ${
                  provider === 'outlook' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => setProvider('outlook')}
              >
                <Mail className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                <span className="text-sm font-medium">Microsoft</span>
              </button>
              <button
                type="button"
                className={`p-4 rounded-lg border-2 transition-all ${
                  provider === 'smtp' 
                    ? 'border-slate-900 bg-slate-50' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => setProvider('smtp')}
              >
                <Server className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                <span className="text-sm font-medium">SMTP</span>
              </button>
            </div>
          </div>

          {/* Email Address */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* OAuth Notice */}
          {(provider === 'gmail' || provider === 'outlook') && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">OAuth Authentication</p>
                  <p className="text-sm text-blue-700 mt-1">
                    After adding, you'll be redirected to {provider === 'gmail' ? 'Google' : 'Microsoft'} to authorize access.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SMTP Fields */}
          {provider === 'smtp' && (
            <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp_host">SMTP Host</Label>
                  <Input
                    id="smtp_host"
                    placeholder="smtp.example.com"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_port">SMTP Port</Label>
                  <Input
                    id="smtp_port"
                    type="number"
                    placeholder="587"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp_username">Username (optional)</Label>
                <Input
                  id="smtp_username"
                  placeholder="Leave blank to use email address"
                  value={smtpUsername}
                  onChange={(e) => setSmtpUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp_password">Password / App Password</Label>
                <div className="relative">
                  <Input
                    id="smtp_password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Use TLS/STARTTLS</Label>
                  <p className="text-xs text-slate-500">Recommended for security</p>
                </div>
                <Switch checked={smtpUseTls} onCheckedChange={setSmtpUseTls} />
              </div>
            </div>
          )}

          {/* Warmup Option */}
          <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center gap-3">
              <Flame className="w-5 h-5 text-orange-600" />
              <div>
                <p className="font-medium text-slate-900">Enable Warmup</p>
                <p className="text-sm text-slate-500">Gradually increase sending volume</p>
              </div>
            </div>
            <Switch checked={warmupEnabled} onCheckedChange={setWarmupEnabled} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { resetForm(); onClose(); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Account'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Account Detail Sheet Component
function AccountDetailSheet({ 
  open, 
  onClose, 
  account, 
  warmupStats,
  loadingStats,
  onVerify, 
  onPause, 
  onResume, 
  onDelete,
  onStartWarmup,
  onPauseWarmup,
  onRefresh,
  verifyingId 
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [editingSettings, setEditingSettings] = useState(false);
  const [warmupSettings, setWarmupSettings] = useState({
    daily_volume: 5,
    ramp_up: 2,
    reply_rate: 30,
    random_delay_min: 60,
    random_delay_max: 300,
    weekend_sending: false,
    auto_pause_bounce_rate: 4.0,
    auto_pause_spam_threshold: 3
  });
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (account) {
      setWarmupSettings({
        daily_volume: account.warmup_daily_volume || 5,
        ramp_up: account.warmup_ramp_up || 2,
        reply_rate: account.warmup_reply_rate || 30,
        random_delay_min: account.warmup_random_delay_min || 60,
        random_delay_max: account.warmup_random_delay_max || 300,
        weekend_sending: account.warmup_weekend_sending || false,
        auto_pause_bounce_rate: account.warmup_auto_pause_bounce_rate || 4.0,
        auto_pause_spam_threshold: account.warmup_auto_pause_spam_threshold || 3
      });
    }
  }, [account]);

  const handleSaveSettings = async () => {
    if (!account) return;
    setSavingSettings(true);
    try {
      await api.patch(`/sending-accounts/${account.id}/warmup/settings`, warmupSettings);
      toast.success('Warmup settings updated');
      setEditingSettings(false);
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setSavingSettings(false);
    }
  };

  if (!account) return null;

  const getProviderIcon = (provider) => {
    switch (provider) {
      case 'gmail':
        return <Mail className="w-5 h-5 text-red-500" />;
      case 'outlook':
        return <Mail className="w-5 h-5 text-blue-500" />;
      default:
        return <Server className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="space-y-4 pb-6 border-b">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                {getProviderIcon(account.provider)}
              </div>
              <div>
                <SheetTitle className="text-xl">{account.email}</SheetTitle>
                <SheetDescription className="flex items-center gap-2 mt-1">
                  {account.is_verified ? (
                    <span className="flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-slate-400">
                      <XCircle className="w-3 h-3" />
                      Not verified
                    </span>
                  )}
                  <span>•</span>
                  <span className="capitalize">{account.provider}</span>
                </SheetDescription>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            {!account.is_verified && (
              <Button 
                size="sm" 
                onClick={() => onVerify(account.id)}
                disabled={verifyingId === account.id}
              >
                {verifyingId === account.id ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Verify
              </Button>
            )}
            {account.is_paused ? (
              <Button size="sm" variant="outline" onClick={() => onResume(account.id)}>
                <Play className="w-4 h-4 mr-2" />
                Resume
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => onPause(account.id)}>
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </Button>
            )}
            <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => onDelete(account.id)}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>

          {/* Pause Warning */}
          {account.is_paused && account.pause_reason && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">Paused: {account.pause_reason}</span>
              </div>
            </div>
          )}
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="warmup">Warmup</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Reputation</span>
                    <Badge variant={account.reputation_score >= 80 ? 'default' : account.reputation_score >= 50 ? 'secondary' : 'destructive'}>
                      {account.reputation_score}/100
                    </Badge>
                  </div>
                  <Progress value={account.reputation_score} className="mt-2" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Health Status</span>
                    <Badge 
                      className={
                        account.health_status === 'healthy' ? 'bg-emerald-100 text-emerald-700' :
                        account.health_status === 'risky' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }
                    >
                      {account.health_status}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    {account.health_status === 'healthy' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : account.health_status === 'risky' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-sm capitalize">{account.health_status}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">Daily Limit</p>
                <p className="text-2xl font-bold text-slate-900">{account.daily_send_limit}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">Sent Today</p>
                <p className="text-2xl font-bold text-slate-900">{account.emails_sent_today}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">Bounce Rate</p>
                <p className={`text-2xl font-bold ${account.bounce_rate > 2 ? 'text-red-600' : 'text-slate-900'}`}>
                  {account.bounce_rate.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Activity Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Activity Overview</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <Send className="w-5 h-5 mx-auto text-blue-600 mb-1" />
                  <p className="text-xl font-bold text-blue-900">{account.total_emails_sent || 0}</p>
                  <p className="text-xs text-blue-600">Total Sent</p>
                </div>
                <div className="text-center p-3 bg-emerald-50 rounded-lg">
                  <Mail className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
                  <p className="text-xl font-bold text-emerald-900">{account.total_replies || 0}</p>
                  <p className="text-xs text-emerald-600">Replies</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <Eye className="w-5 h-5 mx-auto text-purple-600 mb-1" />
                  <p className="text-xl font-bold text-purple-900">{account.total_opens || 0}</p>
                  <p className="text-xs text-purple-600">Opens</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Warmup Tab */}
          <TabsContent value="warmup" className="space-y-6 mt-6">
            {/* Warmup Status */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-500" />
                    Warmup Status
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={onRefresh}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Day {account.warmup_day} of 30</p>
                    <p className="text-sm text-slate-500">
                      {account.warmup_completed ? 'Warmup completed' : 
                       account.warmup_status === 'active' ? 'Warmup in progress' :
                       account.warmup_status === 'paused' ? 'Warmup paused' : 'Warmup not started'}
                    </p>
                  </div>
                  <Badge 
                    className={
                      account.warmup_status === 'active' ? 'bg-orange-100 text-orange-700' :
                      account.warmup_status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      account.warmup_status === 'paused' ? 'bg-slate-100 text-slate-700' :
                      'bg-slate-100 text-slate-500'
                    }
                  >
                    {account.warmup_status}
                  </Badge>
                </div>
                <Progress value={(account.warmup_day / 30) * 100} className="h-3" />
                
                {/* Warmup Actions */}
                <div className="flex gap-2">
                  {account.warmup_status === 'inactive' && account.is_verified && (
                    <Button onClick={() => onStartWarmup(account.id)} className="gap-2">
                      <Play className="w-4 h-4" />
                      Start Warmup
                    </Button>
                  )}
                  {account.warmup_status === 'active' && (
                    <Button variant="outline" onClick={() => onPauseWarmup(account.id)} className="gap-2">
                      <Pause className="w-4 h-4" />
                      Pause Warmup
                    </Button>
                  )}
                  {account.warmup_status === 'paused' && (
                    <Button onClick={() => onStartWarmup(account.id)} className="gap-2">
                      <Play className="w-4 h-4" />
                      Resume Warmup
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Warmup Stats Chart */}
            {loadingStats ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : warmupStats && warmupStats.daily_logs.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Warmup Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={warmupStats.daily_logs}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} tickFormatter={(v) => `Day ${v}`} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      />
                      <Area type="monotone" dataKey="sent" stroke="#f97316" fill="#fed7aa" name="Sent" />
                      <Area type="monotone" dataKey="replies" stroke="#10b981" fill="#a7f3d0" name="Replies" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Activity className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">No warmup data yet</p>
                  <p className="text-sm text-slate-400">Start warmup to see progress</p>
                </CardContent>
              </Card>
            )}

            {/* Warmup Engagement Stats */}
            {warmupStats && (
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-2xl font-bold">{warmupStats.reply_rate}%</p>
                    <p className="text-xs text-slate-500">Reply Rate</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Eye className="w-4 h-4 text-blue-500" />
                    </div>
                    <p className="text-2xl font-bold">{warmupStats.open_rate}%</p>
                    <p className="text-xs text-slate-500">Open Rate</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    </div>
                    <p className="text-2xl font-bold">{warmupStats.bounce_rate}%</p>
                    <p className="text-xs text-slate-500">Bounce Rate</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Warmup Settings</CardTitle>
                  {!editingSettings ? (
                    <Button variant="outline" size="sm" onClick={() => setEditingSettings(true)}>
                      <Settings className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingSettings(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSaveSettings} disabled={savingSettings}>
                        {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Daily Volume */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Starting Daily Volume</Label>
                    <span className="text-sm font-medium">{warmupSettings.daily_volume} emails</span>
                  </div>
                  <Slider
                    value={[warmupSettings.daily_volume]}
                    onValueChange={([v]) => setWarmupSettings(s => ({ ...s, daily_volume: v }))}
                    max={20}
                    min={1}
                    step={1}
                    disabled={!editingSettings}
                  />
                </div>

                {/* Ramp Up */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Daily Ramp Up</Label>
                    <span className="text-sm font-medium">+{warmupSettings.ramp_up} emails/day</span>
                  </div>
                  <Slider
                    value={[warmupSettings.ramp_up]}
                    onValueChange={([v]) => setWarmupSettings(s => ({ ...s, ramp_up: v }))}
                    max={10}
                    min={1}
                    step={1}
                    disabled={!editingSettings}
                  />
                </div>

                {/* Reply Rate Target */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Target Reply Rate</Label>
                    <span className="text-sm font-medium">{warmupSettings.reply_rate}%</span>
                  </div>
                  <Slider
                    value={[warmupSettings.reply_rate]}
                    onValueChange={([v]) => setWarmupSettings(s => ({ ...s, reply_rate: v }))}
                    max={50}
                    min={10}
                    step={5}
                    disabled={!editingSettings}
                  />
                </div>

                <Separator />

                {/* Auto-Pause Settings */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-slate-700">Auto-Pause Triggers</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Pause if bounce rate exceeds</Label>
                      <span className="text-sm font-medium">{warmupSettings.auto_pause_bounce_rate}%</span>
                    </div>
                    <Slider
                      value={[warmupSettings.auto_pause_bounce_rate]}
                      onValueChange={([v]) => setWarmupSettings(s => ({ ...s, auto_pause_bounce_rate: v }))}
                      max={10}
                      min={1}
                      step={0.5}
                      disabled={!editingSettings}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Pause after spam complaints</Label>
                      <span className="text-sm font-medium">{warmupSettings.auto_pause_spam_threshold}</span>
                    </div>
                    <Slider
                      value={[warmupSettings.auto_pause_spam_threshold]}
                      onValueChange={([v]) => setWarmupSettings(s => ({ ...s, auto_pause_spam_threshold: v }))}
                      max={10}
                      min={1}
                      step={1}
                      disabled={!editingSettings}
                    />
                  </div>
                </div>

                <Separator />

                {/* Weekend Sending */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Weekend Sending</Label>
                    <p className="text-sm text-slate-500">Send warmup emails on weekends</p>
                  </div>
                  <Switch
                    checked={warmupSettings.weekend_sending}
                    onCheckedChange={(v) => setWarmupSettings(s => ({ ...s, weekend_sending: v }))}
                    disabled={!editingSettings}
                  />
                </div>
              </CardContent>
            </Card>

            {/* SMTP Configuration (if SMTP provider) */}
            {account.provider === 'smtp' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">SMTP Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-500">Host</Label>
                      <p className="font-medium">{account.smtp_host}</p>
                    </div>
                    <div>
                      <Label className="text-slate-500">Port</Label>
                      <p className="font-medium">{account.smtp_port}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-slate-500">Username</Label>
                    <p className="font-medium">{account.smtp_username || account.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-slate-500">TLS/STARTTLS</Label>
                    {account.smtp_use_tls ? (
                      <Badge className="bg-emerald-100 text-emerald-700">Enabled</Badge>
                    ) : (
                      <Badge variant="outline">Disabled</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
