'use client';

import { useEffect, useState } from 'react';
import { agentService } from '@/services/agent.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { User, Wallet, Users, Shield, Calendar, Mail, Phone, Award } from 'lucide-react';

export default function AgentProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const res = await agentService.getAgentProfile();
      setProfile((res as any).data || res);
    } catch (err) { console.error('Failed to load profile', err); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground text-sm">Loading profile...</div>;
  if (!profile) return <div className="text-center py-12 text-muted-foreground text-sm">Profile not found</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
        <User className="w-5 h-5 text-brand-teal" /> My Profile
      </h2>

      {/* Profile Header */}
      <div className="bg-card rounded-xl border p-6 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-brand-teal rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {(profile.displayName || profile.username)?.[0]?.toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">{profile.displayName}</h3>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
            <span className={cn('mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium',
              'bg-brand-teal/10 text-brand-teal')}>
              {profile.agentType?.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-green-500" />
            <p className="text-xs text-muted-foreground">Balance</p>
          </div>
          <p className="text-lg font-bold text-green-600">{formatCurrency(profile.balance || 0)}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-blue-500" />
            <p className="text-xs text-muted-foreground">Credit Limit</p>
          </div>
          <p className="text-lg font-bold text-blue-600">{formatCurrency(profile.creditLimit || 0)}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-purple-500" />
            <p className="text-xs text-muted-foreground">Players</p>
          </div>
          <p className="text-lg font-bold text-purple-600">{profile.playerCount || 0} / {profile.maxPlayersAllowed || '∞'}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-4 h-4 text-orange-500" />
            <p className="text-xs text-muted-foreground">Commission Rate</p>
          </div>
          <p className="text-lg font-bold text-orange-600">{profile.commissionRate || 0}%</p>
        </div>
      </div>

      {/* Details */}
      <div className="bg-card rounded-xl border p-6">
        <h3 className="font-semibold text-foreground text-sm mb-4">Account Details</h3>
        <div className="space-y-3">
          {[
            { icon: Mail, label: 'Email', value: profile.email || 'Not set' },
            { icon: Phone, label: 'Phone', value: profile.phone || 'Not set' },
            { icon: Shield, label: 'Status', value: profile.status },
            { icon: Calendar, label: 'Member Since', value: formatDate(profile.createdAt) },
            { icon: Calendar, label: 'Last Login', value: profile.lastLoginAt ? formatDate(profile.lastLoginAt) : 'Never' },
            { icon: Users, label: 'Sub-Agents', value: profile.subAgentCount || 0 },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
              <Icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground w-32">{label}</span>
              <span className="text-sm font-medium text-foreground">{String(value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
