'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Navbar from '@/components/Navbar';

export default function RulesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) { router.push('/login'); return null; }

  const rules = [
    'All bets are subject to the rules and regulations of this platform.',
    'Minimum and maximum bet amounts are set by your agent and can vary per player.',
    'Bets placed during live matches are subject to a confirmation delay. If odds change during this delay, the bet may be rejected.',
    'Once a bet is confirmed, it cannot be modified. Deletion is only possible within 30 seconds if enabled by your agent.',
    'Match winner bets are settled based on the official match result. If a match is abandoned, all bets will be void.',
    'Session/Fancy bets are settled based on the final session result. Incomplete sessions will be void.',
    'In case of a tie or no result, match winner bets will be void and stakes returned.',
    'The platform reserves the right to void any bet if irregularities are detected.',
    'Account balances are managed by your assigned agent. Contact your agent for deposits and withdrawals.',
    'Users must not share their account credentials. Each account is for individual use only.',
    'The platform is not responsible for any loss due to misunderstanding of odds or bet types.',
    'All decisions made by the platform management regarding bet settlement are final.',
    'Users found engaging in fraudulent activity will have their accounts suspended permanently.',
    'The platform may update these rules at any time. Users are responsible for staying informed.',
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Rules & Conditions</h2>

        <div className="bg-white rounded-xl shadow-sm border p-5 sm:p-6">
          <ol className="space-y-4">
            {rules.map((rule, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </span>
                <p className="text-sm text-gray-700 leading-relaxed pt-0.5">{rule}</p>
              </li>
            ))}
          </ol>
        </div>
      </main>
    </div>
  );
}
