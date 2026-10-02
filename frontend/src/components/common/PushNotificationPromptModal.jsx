import { useState, useEffect } from 'react';
import { BellRing, Sparkles, X, CheckCircle2, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  isPushNotificationSupported,
  getNotificationPermission,
  getExistingPushSubscription,
  subscribeToPushNotifications,
  sendTestPushNotification
} from '@/lib/push-notifications';

export function PushNotificationPromptModal({ userType = 'CUSTOMER', userId = null, autoOpenDelay = 1200 }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const isSupp = isPushNotificationSupported();
    setSupported(isSupp);
    if (!isSupp) return;

    const perm = getNotificationPermission();
    if (perm === 'granted') {
      return; // Already enabled
    }

    // Check if dismissed recently (within 1 hour)
    const dismissedAt = sessionStorage.getItem('push_prompt_dismissed');
    if (dismissedAt) return;

    // Check existing subscription
    getExistingPushSubscription().then((sub) => {
      if (!sub) {
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, autoOpenDelay);
        return () => clearTimeout(timer);
      }
    });
  }, [autoOpenDelay]);

  const handleEnable = async () => {
    setLoading(true);
    try {
      await subscribeToPushNotifications({ userType, userId });
      setIsOpen(false);
      toast.success('🎉 បានបើកការជូនដំណឹង Push Notifications ដោយជោគជ័យ!');

      // Send a test notification immediately so the user sees it work!
      setTimeout(() => {
        sendTestPushNotification({
          title: '🔥 Flame & Crust',
          body: 'សួស្តី! ការជូនដំណឹង (Push Notification) ដំណើរការបានជោគជ័យហើយ 🎉',
          userId,
          userType
        }).catch(() => {});
      }, 1000);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'បរាជ័យក្នុងការបើកការជូនដំណឹង');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsOpen(false);
    sessionStorage.setItem('push_prompt_dismissed', Date.now().toString());
  };

  if (!supported) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleDismiss(); }}>
      <DialogContent className="max-w-[380px] sm:max-w-[420px] rounded-3xl p-6 border-2 border-red-500/30 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-16 -left-16 size-40 bg-red-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 size-40 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col items-center text-center">
          {/* Bell Icon with ring animation */}
          <div className="relative size-16 sm:size-18 rounded-3xl bg-gradient-to-tr from-red-600 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-red-500/30 mb-4 animate-pulse">
            <BellRing className="size-8 sm:size-9 animate-bounce" />
            <span className="absolute -top-1 -right-1 size-4 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-zinc-900" />
          </div>

          <DialogTitle className="text-lg sm:text-xl font-black text-slate-900 dark:text-zinc-100 mb-1">
            បើកការជូនដំណឹង (Turn on Notifications)
          </DialogTitle>

          <DialogDescription className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 font-medium leading-relaxed mb-6">
            {userType === 'DRIVER' ? (
              <>
                កុំឱ្យខកខាន <strong className="text-red-600 dark:text-red-400">Order ថ្មីៗ</strong> និងសារទាក់ទងពីអតិថិជន! លោត Notification លើអេក្រង់ទូរស័ព្ទ ទោះបីជាបិទ App ក៏ដោយ។
              </>
            ) : (
              <>
                ទទួលដំណឹងភ្លាមៗនៅពេល <strong className="text-red-600 dark:text-red-400">ចុងភៅធ្វើម្ហូបរួចរាល់</strong> និងនៅពេលអ្នកដឹកកំពុងធ្វើដំណើរមកដល់!
              </>
            )}
          </DialogDescription>

          <div className="w-full space-y-2.5">
            <Button
              onClick={handleEnable}
              disabled={loading}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-red-600/30 gap-2 transition-all active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>កំពុងបើកដំណើរការ...</span>
                </>
              ) : (
                <>
                  <BellRing className="size-4.5" />
                  <span>បើកការជូនដំណឹងឥឡូវនេះ</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              onClick={handleDismiss}
              className="w-full text-xs text-slate-500 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300 font-semibold"
            >
              ទុកពេលក្រោយ (Maybe Later)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PushNotificationPromptModal;
