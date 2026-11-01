import React, { useState } from 'react';
import { Check, Copy, Smartphone, X } from 'lucide-react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isIOS: boolean;
  isInIframe: boolean;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  isIOS,
  isInIframe,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const appUrl =
    typeof window !== 'undefined' ? window.location.origin : '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-modal-title"
    >
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-[#FAF8F5] dark:bg-[#0D0D10] border-t sm:border border-[#E5E0D8] dark:border-[#1E1D1B] p-6 text-[#171614] dark:text-[#F4EFE6] shadow-2xl">
        <div className="w-10 h-1.5 bg-[#D6D0C4] dark:bg-[#272624] rounded-full mx-auto mb-4 sm:hidden" />

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F2B705]/15 text-[#9A6500] dark:text-[#F2B705] flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="install-modal-title"
                className="font-display text-lg font-semibold tracking-tight"
              >
                Install TwilightNote on Phone
              </h2>
              <p className="text-xs text-[#6E685F] dark:text-[#8E877C]">
                Standalone OLED app · Offline auto-save · Zero Android Studio
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close installation guide"
            className="min-h-[44px] min-w-[44px] -mr-2 -mt-2 flex items-center justify-center rounded-xl text-[#6E685F] hover:text-[#171614] dark:text-[#8E877C] dark:hover:text-[#F4EFE6] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]/70"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 pt-5 border-t border-[#E5E0D8] dark:border-[#1E1D1B] space-y-4 text-sm leading-relaxed text-[#423E38] dark:text-[#CFC8BC]">
          {isInIframe && (
            <p className="text-xs text-[#9A6500] dark:text-[#F2B705]">
              Preview frames restrict direct install prompts. Copy the app link
              below and open it directly in Chrome on Android or Safari on iOS.
            </p>
          )}

          {isIOS ? (
            <ol className="space-y-2.5 list-decimal list-inside">
              <li>
                Open this app URL directly in <strong>Safari</strong> on your
                iPhone or iPad.
              </li>
              <li>
                Tap the <strong>Share</strong> icon in the bottom toolbar.
              </li>
              <li>
                Tap <strong>Add to Home Screen</strong> to launch TwilightNote
                full-screen.
              </li>
            </ol>
          ) : (
            <ol className="space-y-2.5 list-decimal list-inside">
              <li>
                Open the app link below in <strong>Google Chrome</strong> on
                your Android phone.
              </li>
              <li>
                Tap <strong>Install App</strong> in the top bar (or Chrome menu{' '}
                <strong>⋮</strong> → <strong>Install app</strong>).
              </li>
              <li>
                Android installs <strong>TwilightNote</strong> directly into
                your app drawer like an APK.
              </li>
            </ol>
          )}

          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopyLink}
              className="min-h-[48px] flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#F2B705] hover:bg-[#E2AA00] text-[#171614] font-semibold text-sm active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]/70"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>App Link Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy App Link for Phone</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] px-4 py-2.5 rounded-xl border border-[#E5E0D8] dark:border-[#1E1D1B] text-[#171614] dark:text-[#F4EFE6] hover:bg-[#F2EEE6] dark:hover:bg-[#151519] font-medium text-sm active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]/70"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
