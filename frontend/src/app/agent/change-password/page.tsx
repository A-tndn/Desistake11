'use client';

import { useState } from 'react';
import { agentService } from '@/services/agent.service';
import { cn } from '@/lib/utils';
import { KeyRound, Save } from 'lucide-react';

export default function ChangePasswordPage() {
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    if (form.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await agentService.changeAgentPassword({ oldPassword: form.oldPassword, newPassword: form.newPassword });
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to change password' });
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
        <KeyRound className="w-5 h-5 text-brand-teal" /> Change Password
      </h2>

      {message.text && (
        <div className={cn('mb-4 p-3 rounded-lg text-sm',
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200')}>
          {message.text}
        </div>
      )}

      <div className="bg-card rounded-xl border p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Current Password</label>
            <input type="password" value={form.oldPassword} onChange={(e) => setForm({ ...form, oldPassword: e.target.value })}
              required className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-teal outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">New Password</label>
            <input type="password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              required minLength={6} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-teal outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Confirm New Password</label>
            <input type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              required className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-teal outline-none" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-brand-teal text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
            <Save className="w-4 h-4" /> {loading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
