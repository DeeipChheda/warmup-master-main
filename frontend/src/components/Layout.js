import { Link, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { 
  LayoutDashboard, Mail, Users, Send, LogOut, ShieldCheck, Crown, 
  Flame, Server, BarChart3, Shield, Ban, Sparkles, RotateCw, 
  Building2, Settings, TrendingUp, AlertTriangle, Lock, Zap
} from 'lucide-react';

export default function Layout({ children, user, onLogout }) {
  const location = useLocation();

  // Plan-based feature access
  const planFeatures = {
    free: ['dashboard', 'warmup', 'domains', 'contacts', 'campaigns'],
    premium: ['dashboard', 'warmup', 'domains', 'sending-accounts', 'contacts', 'campaigns', 'sequences', 'analytics'],
    pro: ['dashboard', 'warmup', 'domains', 'sending-accounts', 'contacts', 'campaigns', 'sequences', 'analytics', 'deliverability', 'suppression', 'ai-assistant', 'domain-rotation'],
    enterprise: ['dashboard', 'warmup', 'domains', 'sending-accounts', 'contacts', 'campaigns', 'sequences', 'analytics', 'deliverability', 'suppression', 'ai-assistant', 'domain-rotation', 'clients'],
    enterprise_internal: ['dashboard', 'warmup', 'domains', 'sending-accounts', 'contacts', 'campaigns', 'sequences', 'analytics', 'deliverability', 'suppression', 'ai-assistant', 'domain-rotation', 'clients']
  };

  const hasAccess = (feature) => {
    // Founder account always has access
    if (user.role === 'founder' || user.plan === 'enterprise_internal') {
      return true;
    }
    return planFeatures[user.plan]?.includes(feature);
  };

  // Primary navigation
  const primaryNav = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, key: 'dashboard' },
    { path: '/warmup', label: 'Warm-Up', icon: Flame, key: 'warmup', badge: 'priority', highlight: true },
    { path: '/domains', label: 'Domains', icon: ShieldCheck, key: 'domains' },
    { path: '/sending-accounts', label: 'Sending Accounts', icon: Server, key: 'sending-accounts' },
    { path: '/contacts', label: 'Contacts', icon: Users, key: 'contacts' },
    { path: '/campaigns', label: 'Campaigns', icon: Mail, key: 'campaigns' },
    { path: '/sequences', label: 'Sequences', icon: Zap, key: 'sequences' },
    { path: '/analytics', label: 'Analytics', icon: BarChart3, key: 'analytics' },
    { path: '/deliverability', label: 'Deliverability', icon: Shield, key: 'deliverability', highlight: true },
    { path: '/suppression', label: 'Suppression', icon: Ban, key: 'suppression' }
  ];

  // Advanced features
  const advancedNav = [
    { path: '/ai-assistant', label: 'AI Assistant', icon: Sparkles, key: 'ai-assistant', badge: 'pro' },
    { path: '/domain-rotation', label: 'Domain Rotation', icon: RotateCw, key: 'domain-rotation', badge: 'pro' },
    { path: '/clients', label: 'Clients', icon: Building2, key: 'clients', badge: 'enterprise' }
  ];

  // Footer navigation
  const footerNav = [
    { path: '/settings', label: 'Settings', icon: Settings, key: 'settings' },
    { path: '/upgrade', label: 'Upgrade Plan', icon: TrendingUp, key: 'upgrade', special: true }
  ];

  const getPlanBadge = (plan) => {
    const colors = {
      free: 'bg-slate-100 text-slate-700',
      premium: 'bg-blue-100 text-blue-700',
      pro: 'bg-purple-100 text-purple-700',
      enterprise: 'bg-amber-100 text-amber-700'
    };
    return colors[plan] || colors.free;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 overflow-y-auto">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">WarmUp Master</h1>
                <p className="text-xs text-slate-500">Deliverability First</p>
              </div>
            </div>
          </div>

          {/* Primary Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {primaryNav.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const hasFeatureAccess = hasAccess(item.key);
              const isLocked = !hasFeatureAccess;

              return (
                <Link 
                  key={item.path} 
                  to={isLocked ? '/upgrade' : item.path}
                  onClick={(e) => {
                    if (isLocked) {
                      e.preventDefault();
                      // Could show modal here
                    }
                  }}
                >
                  <div
                    data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${
                      isActive && hasFeatureAccess
                        ? 'bg-slate-900 text-white shadow-sm'
                        : isLocked
                        ? 'text-slate-400 opacity-60 cursor-not-allowed'
                        : item.highlight
                        ? 'text-slate-900 font-semibold hover:bg-slate-100'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${item.highlight && !isActive ? 'text-orange-600' : ''}`} />
                      <span className="text-sm">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {item.badge === 'priority' && !isActive && (
                        <Flame className="w-3 h-3 text-orange-500" />
                      )}
                      {isLocked && <Lock className="w-3 h-3" />}
                    </div>
                  </div>
                </Link>
              );
            })}

            {/* Advanced Features Section */}
            <div className="pt-4">
              <Separator className="mb-4" />
              <div className="px-3 mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Advanced
                </span>
              </div>
              {advancedNav.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                const hasFeatureAccess = hasAccess(item.key);
                const isLocked = !hasFeatureAccess;

                return (
                  <Link 
                    key={item.path} 
                    to={isLocked ? '/upgrade' : item.path}
                    onClick={(e) => {
                      if (isLocked) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <div
                      data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${
                        isActive && hasFeatureAccess
                          ? 'bg-slate-900 text-white'
                          : isLocked
                          ? 'text-slate-400 opacity-60 cursor-not-allowed'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span className="text-sm">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {item.badge && isLocked && (
                          <Badge className="text-xs px-1.5 py-0 bg-purple-100 text-purple-700 capitalize">
                            {item.badge}
                          </Badge>
                        )}
                        {isLocked && <Lock className="w-3 h-3" />}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Footer Navigation */}
          <div className="p-4 border-t border-slate-200 space-y-1">
            {footerNav.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link key={item.path} to={item.path}>
                  <div
                    data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : item.special
                        ? 'text-green-700 font-semibold hover:bg-green-50'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${item.special ? 'text-green-600' : ''}`} />
                    <span className="text-sm">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* User Info */}
          <div className="p-4 border-t border-slate-200">
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-semibold">
                  {user.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{user.full_name}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Crown className="w-3 h-3 text-slate-400" />
                <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${getPlanBadge(user.plan)}`}>
                  {user.plan} Plan
                </span>
              </div>
            </div>
            <Button
              data-testid="logout-button"
              variant="outline"
              size="sm"
              onClick={onLogout}
              className="w-full"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64">
        <main>{children}</main>
      </div>
    </div>
  );
}
