'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { userService } from '@/services/user.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import Navbar from '@/components/Navbar';

export default function ProfilePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    loadProfile();
  }, [isAuthenticated]);

  const loadProfile = async () => {
    try {
      const res = await userService.getProfile();
      setProfile((res as any).data);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">My Profile</h2>

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">Loading...</div>
        ) : !profile ? (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">Profile not found</div>
        ) : (
          <div className="space-y-4">
            {/* Personal Info */}
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Personal Information</h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-gray-500">Client Code</span>
                  <span className="text-sm font-medium text-gray-900">@{profile.username}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-gray-500">Display Name</span>
                  <span className="text-sm font-medium text-gray-900">{profile.displayName || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-gray-500">Email</span>
                  <span className="text-sm font-medium text-gray-900">{profile.email || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-gray-500">Phone</span>
                  <span className="text-sm font-medium text-gray-900">{profile.phone || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-gray-500">Role</span>
                  <span className="text-sm font-medium text-gray-900 capitalize">{profile.role?.toLowerCase().replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-gray-500">Status</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    profile.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>{profile.status}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm text-gray-500">Member Since</span>
                  <span className="text-sm font-medium text-gray-900">{formatDate(profile.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Financial Info */}
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Financial Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500">Balance</p>
                  <p className="text-xl font-bold text-green-600 mt-1">{formatCurrency(Number(profile.balance))}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500">Credit Limit</p>
                  <p className="text-xl font-bold text-blue-600 mt-1">{formatCurrency(Number(profile.creditLimit))}</p>
                </div>
              </div>
            </div>

            {/* Agent Info */}
            {profile.agent && (
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Agent Information</h3>
                <div className="flex justify-between py-2">
                  <span className="text-sm text-gray-500">Agent</span>
                  <span className="text-sm font-medium text-gray-900">{profile.agent.displayName} (@{profile.agent.username})</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <button
              onClick={() => router.push('/change-password')}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition"
            >
              Change Password
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
