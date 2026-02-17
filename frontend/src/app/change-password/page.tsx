'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { userService } from '@/services/user.service';
import { showToast } from '@/components/Toast';
import Navbar from '@/components/Navbar';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated) { router.push('/login'); return null; }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      showToast({ type: 'error', title: 'Error', message: 'New passwords do not match' });
      return;
    }
    if (form.newPassword.length < 6) {
      showToast({ type: 'error', title: 'Error', message: 'Password must be at least 6 characters' });
      return;
    }
    setLoading(true);
    try {
      await userService.changePassword(form.oldPassword, form.newPassword);
      showToast({ type: 'success', title: 'Success', message: 'Password changed successfully' });
      setForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => router.push('/profile'), 1500);
    } catch (error: any) {
      showToast({ type: 'error', title: 'Failed', message: error.response?.data?.message || 'Failed to change password' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-md mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Change Password</h2>

        <div className="bg-white rounded-xl shadow-sm border p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input
                type="password"
                value={form.oldPassword}
                onChange={(e) => setForm({ ...form, oldPassword: e.target.value })}
                required
                className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                required
                minLength={6}
                className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                required
                minLength={6}
                className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
