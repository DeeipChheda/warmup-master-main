import { useState, useEffect } from 'react';
import { api } from '../App';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { toast } from 'sonner';
import { Ban, Plus, Trash2, AlertTriangle, Shield } from 'lucide-react';

export default function SuppressionPage() {
  const [suppressedEmails, setSuppressedEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ email: '', reason: 'manual' });

  useEffect(() => {
    loadSuppressedEmails();
  }, []);

  const loadSuppressedEmails = async () => {
    try {
      const res = await api.get('/suppressed-emails');
      setSuppressedEmails(res.data);
    } catch (error) {
      console.error('Error loading suppressed emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuppressed = async (e) => {
    e.preventDefault();
    try {
      await api.post('/suppressed-emails', formData);
      toast.success('Email added to suppression list');
      setDialogOpen(false);
      setFormData({ email: '', reason: 'manual' });
      loadSuppressedEmails();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add email');
    }
  };

  const handleRemove = async (emailId) => {
    if (!window.confirm('Remove this email from suppression list?')) return;
    
    try {
      await api.delete(`/suppressed-emails/${emailId}`);
      toast.success('Email removed from suppression list');
      loadSuppressedEmails();
    } catch (error) {
      toast.error('Failed to remove email');
    }
  };

  const getReasonBadge = (reason) => {
    const variants = {
      hard_bounce: { bg: 'bg-red-100', text: 'text-red-800', label: 'Hard Bounce' },
      spam_complaint: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Spam Complaint' },
      unsubscribe: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Unsubscribed' },
      manual: { bg: 'bg-slate-100', text: 'text-slate-800', label: 'Manual' }
    };
    const variant = variants[reason] || variants.manual;
    return <Badge className={`${variant.bg} ${variant.text}`}>{variant.label}</Badge>;
  };

  const stats = {
    hard_bounces: suppressedEmails.filter(e => e.reason === 'hard_bounce').length,
    spam_complaints: suppressedEmails.filter(e => e.reason === 'spam_complaint').length,
    unsubscribes: suppressedEmails.filter(e => e.reason === 'unsubscribe').length,
    manual: suppressedEmails.filter(e => e.reason === 'manual').length
  };

  if (loading) {
    return <div data-testid="suppression-loading" className="p-6">Loading...</div>;
  }

  return (
    <div data-testid="suppression-page" className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Ban className="w-8 h-8 text-red-600" />
            <h1 className="text-3xl font-bold text-slate-900">Suppression List</h1>
          </div>
          <p className="text-slate-600">{suppressedEmails.length} suppressed email addresses</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-suppressed-button" className="bg-slate-900 hover:bg-slate-800">
              <Plus className="w-4 h-4 mr-2" />
              Add Email
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="add-suppressed-dialog">
            <DialogHeader>
              <DialogTitle>Add to Suppression List</DialogTitle>
              <DialogDescription>
                Add an email address to prevent future sends
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddSuppressed}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    data-testid="suppressed-email-input"
                    type="email"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason *</Label>
                  <Select
                    value={formData.reason}
                    onValueChange={(value) => setFormData({ ...formData, reason: value })}
                  >
                    <SelectTrigger data-testid="reason-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual Addition</SelectItem>
                      <SelectItem value="hard_bounce">Hard Bounce</SelectItem>
                      <SelectItem value="spam_complaint">Spam Complaint</SelectItem>
                      <SelectItem value="unsubscribe">Unsubscribed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button data-testid="submit-suppressed-button" type="submit" className="bg-slate-900 hover:bg-slate-800">
                  Add to List
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600 mb-1">Hard Bounces</p>
            <p className="text-2xl font-bold text-slate-900">{stats.hard_bounces}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600 mb-1">Spam Complaints</p>
            <p className="text-2xl font-bold text-slate-900">{stats.spam_complaints}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600 mb-1">Unsubscribed</p>
            <p className="text-2xl font-bold text-slate-900">{stats.unsubscribes}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-slate-500">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600 mb-1">Manual</p>
            <p className="text-2xl font-bold text-slate-900">{stats.manual}</p>
          </CardContent>
        </Card>
      </div>

      {/* Info Alert */}
      <Alert className="bg-blue-50 border-blue-200">
        <Shield className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Auto-Protection:</strong> Hard bounces and spam complaints are automatically added to this list to protect your sender reputation.
        </AlertDescription>
      </Alert>

      {/* Suppression Table */}
      {suppressedEmails.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppressedEmails.map((item) => (
                  <TableRow key={item.id} data-testid={`suppressed-row-${item.id}`}>
                    <TableCell className="font-medium">{item.email}</TableCell>
                    <TableCell>{getReasonBadge(item.reason)}</TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {new Date(item.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        data-testid={`remove-button-${item.id}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(item.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Ban className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No suppressed emails</h3>
              <p className="text-slate-600 mb-4">Your suppression list is empty</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
