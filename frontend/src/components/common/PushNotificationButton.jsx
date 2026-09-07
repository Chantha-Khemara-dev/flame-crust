import { useState, useEffect } from 'react';
import { Bell, BellOff, BellRing, CheckCircle2, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  isPushNotificationSupported,
  getNotificationPermission,
  getExistingPushSubscription,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  sendTestPushNotification
} from '@/lib/push-notifications';

export function PushNotificationButton({ userType = 'CUSTOMER', userId = null, className = '' }) {
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const isSupp = isPushNotificationSupported();
    setSupported(isSupp);
    if (!isSupp) return;

    setPermission(getNotificationPermission());

    getExistingPushSubscription().then((sub) => {
      setIsSubscribed(!!sub);
    });
  }, []);

  const handleToggle = async () => {
    if (!supported) {
      toast.error('Browser របស់អ្នកមិនទាន់គាំទ្រ Web Push Notification នៅឡើយទេ។');
      return;
    }

    setLoading(true);
    try {
      if (isSubscribed) {
        await unsubscribeFromPushNotifications();
        setIsSubscribed(false);
        toast.info('បានបិទការជូនដំណឹង Push Notifications រួចរាល់');
      } else {
        await subscribeToPushNotifications({ userType, userId });
        setIsSubscribed(true);
        setPermission('granted');
        toast.success('🎉 បានបើកការជូនដំណឹង Push Notifications ដោយជោគជ័យ!');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'បរាជ័យក្នុងការបើកការជូនដំណឹង');
      setPermission(getNotificationPermission());
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    setTesting(true);
    try {
      // Auto-subscribe if not yet subscribed
      if (!isSubscribed) {
        await subscribeToPushNotifications({ userType, userId });
        setIsSubscribed(true);
        setPermission('granted');
      }

      await sendTestPushNotification({
        title: '🔥 Flame & Crust',
        body: 'សួស្តី! ការជូនដំណឹងក្រៅ App (Push Notification) ដំណើរការបានជោគជ័យហើយ 🎉',
        url: window.location.pathname,
        userId,
        userType
      });

      toast.success('🚀 បានផ្ញើ Test Push Notification ទៅកាន់ឧបករណ៍របស់អ្នកហើយ! សូមពិនិត្យមើលលើអេក្រង់។');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'មិនអាចផ្ញើ Test Notification បានទេ');
    } finally {
      setTesting(false);
    }
  };

  if (!supported) return null;

  return (
    <div className={`inline-flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-zinc-800/80 rounded-2xl border border-slate-200/80 dark:border-zinc-700/60 shadow-xs ${className}`}>
      <Button
        variant={isSubscribed ? "secondary" : "default"}
        size="sm"
        onClick={handleToggle}
        disabled={loading}
        className={`gap-2 rounded-xl text-xs font-semibold transition-all select-none ${
          isSubscribed 
            ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" 
            : "bg-red-600 hover:bg-red-700 text-white shadow-xs hover:shadow-red-500/25"
        }`}
      >
        {loading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : isSubscribed ? (
          <>
            <BellRing className="size-3.5 text-emerald-500 animate-bounce" />
            <span className="hidden sm:inline">បានបើក Noti</span>
            <span className="sm:hidden">Noti On</span>
          </>
        ) : (
          <>
            <Bell className="size-3.5" />
            <span>បើក Noti ខាងក្រៅ</span>
          </>
        )}
      </Button>

      {isSubscribed && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleSendTest}
          disabled={testing}
          className="rounded-xl text-xs gap-1.5 border-slate-200 dark:border-zinc-700 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 hover:border-red-300 dark:hover:border-red-800/60 transition-colors"
          title="ចុចដើម្បី Test ផ្ញើ Notification មកលើទូរស័ព្ទ ឬកុំព្យូទ័រឥឡូវនេះ"
        >
          {testing ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Send className="size-3 text-red-500" />
          )}
          <span className="hidden sm:inline">Test Noti</span>
        </Button>
      )}
    </div>
  );
}
export default PushNotificationButton;
