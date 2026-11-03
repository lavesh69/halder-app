import React, { useEffect, useState } from 'react';

interface GoogleSignInButtonProps {
  role?: 'customer' | 'farmer';
  onSuccess: (credential: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (notification?: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
        };
      };
    };
  }
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  role = 'customer',
  onSuccess,
  onError,
  disabled = false,
}) => {
  const [loading, setLoading] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  useEffect(() => {
    if (!clientId) return;

    if (!document.getElementById('google-gsi-script')) {
      const script = document.createElement('script');
      script.id = 'google-gsi-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        initGoogle();
      };
      document.body.appendChild(script);
    } else {
      initGoogle();
    }
  }, [clientId, role]);

  const initGoogle = () => {
    if (window.google?.accounts?.id && clientId) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (res: any) => {
          if (res.credential) {
            onSuccess(res.credential);
          } else if (onError) {
            onError('No Google credential returned.');
          }
        },
      });
    }
  };

  const handleGoogleClick = () => {
    if (disabled || loading) return;

    if (clientId && window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
      return;
    }

    setLoading(true);
    const demoSub = `google_sub_${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const testEmail = role === 'farmer' ? 'rajesh.farmer@gmail.com' : 'aman.customer@gmail.com';
    const testName = role === 'farmer' ? 'Rajesh Kumar (Google)' : 'Aman Sharma (Google)';
    const testToken = `test_google_token_${demoSub}_${testEmail}_${testName.replace(/ /g, '-')}`;

    setTimeout(() => {
      setLoading(false);
      onSuccess(testToken);
    }, 600);
  };

  return (
    <button
      type="button"
      onClick={handleGoogleClick}
      disabled={disabled || loading}
      className={`w-full py-3.5 px-4 bg-white dark:bg-[#1B201D] hover:bg-zinc-50 dark:hover:bg-zinc-800/80 active:scale-[0.98] border border-zinc-200 dark:border-zinc-700/80 rounded-2xl shadow-soft font-bold text-sm text-zinc-800 dark:text-zinc-200 flex items-center justify-center gap-3 transition-all ${
        disabled || loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        />
      </svg>
      <span>{loading ? 'Connecting to Google...' : 'Continue with Google'}</span>
    </button>
  );
};
