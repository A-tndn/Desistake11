'use client';

import { useEffect, useState } from 'react';
import { agentService } from '@/services/agent.service';
import { cn } from '@/lib/utils';
import { ImagePlus, Save } from 'lucide-react';

export default function BannerManagementPage() {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => { loadBanners(); }, []);

  const loadBanners = async () => {
    try {
      const res = await agentService.getBanners();
      setBanners((res as any).data || []);
    } catch (err) { console.error('Failed to load banners', err); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
        <ImagePlus className="w-5 h-5 text-brand-teal" /> Banner Management
      </h2>

      {message.text && (
        <div className={cn('mb-3 p-3 rounded-lg text-sm',
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
          {message.text}
        </div>
      )}

      <div className="bg-card rounded-xl border p-6">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Loading banners...</div>
        ) : banners.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">No banners configured. Contact master admin.</div>
        ) : (
          <div className="space-y-3">
            {banners.map((b: any, idx: number) => (
              <div key={b.id || idx} className="p-3 border rounded-lg">
                <p className="text-sm font-medium">{b.title}</p>
                <p className="text-xs text-muted-foreground">{b.content}</p>
                <span className={cn('mt-1 inline-block px-2 py-0.5 rounded text-[10px] font-medium',
                  b.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                  {b.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
