import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ArrowRight, Sprout, ShieldCheck, HeartHandshake, Sparkles, Loader2, RotateCcw, CheckCircle2, X, ShoppingBag } from 'lucide-react';
import { GoogleSignInButton } from '../common/GoogleSignInButton';
import { Logo } from '../common/Logo';
import { ApiClient } from '../../api/client';

interface OnboardingProps {
  initialShowLogin?: boolean;
  onClose?: () => void;
}

const slides = [
  {
    step: '01',
    badge: 'Direct Farm Harvest',
    title: 'Fresh produce, directly from farmers',
    description: 'Buy vegetables, fruits, and fresh food without unnecessary middlemen. Enjoy lower prices and higher nutrition.',
    icon: Sprout,
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80',
    stat: '100% Direct Sourced',
  },
  {
    step: '02',
    badge: 'Transparent Provenance',
    title: 'Know where your food comes from',
    description: 'See the exact farm, harvesting time, soil type, and farmer behind every single vegetable you put on your plate.',
    icon: ShieldCheck,
    image: 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=800&auto=format&fit=crop&q=80',
    stat: 'Verified Local Farms',
  },
  {
    step: '03',
    badge: 'Fair & Sustainable',
    title: 'Simple. Fresh. Direct.',
    description: 'Empowering local farmers with fair earnings while bringing farm-to-table simplicity straight to your home.',
    icon: HeartHandshake,
    image: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&auto=format&fit=crop&q=80',
    stat: 'Zero Middlemen Cut',
  },
];

export const Onboarding: React.FC<OnboardingProps> = ({ initialShowLogin = false, onClose }) => {
  const { setHasSeenOnboarding, setIsLoggedIn, loginUser, loginWithGoogle, showToast } = useApp();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showRolePick, setShowRolePick] = useState(initialShowLogin);
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [selectedRole, setSelectedRole] = useState<'customer' | 'farmer'>('customer');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      setShowRolePick(true);
    }
  };

  const handleSendOtp = async () => {
    const clean = mobileNumber.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) {
      showToast('Please enter a valid 10-digit mobile number', 'error');
      return;
    }

    setIsSendingOtp(true);
    try {
      const res: any = await ApiClient.sendOtp(clean);
      setIsOtpSent(true);
      setCooldown(res?.cooldownSeconds || 60);
      if (res?.devOtp) {
        setDevOtp(res.devOtp);
      }
      showToast(res?.message || 'OTP dispatched to your mobile', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to send OTP. Please retry.', 'error');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length < 4) {
      showToast('Please enter the verification code', 'error');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      await ApiClient.verifyOtp({
        phone: mobileNumber.replace(/\D/g, '').slice(-10),
        otp: otp.trim(),
        role: selectedRole,
      });
      showToast('Mobile verified successfully! Welcome to HALDER.', 'success');
      loginUser(selectedRole, mobileNumber);
    } catch (err: any) {
      showToast(err.message || 'Invalid or expired OTP', 'error');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  if (showRolePick) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col justify-between bg-[#F7F9F6] dark:bg-[#0F1411] p-6 max-w-lg mx-auto overflow-y-auto">
        <div className="pt-6 space-y-2 text-center relative">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-0 right-0 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <div className="flex justify-center mb-1">
            <Logo size="md" showTagline />
          </div>
          <h2 className="text-2xl font-black text-zinc-900 dark:text-white">
            Sign In to Continue
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Select your role and enter mobile number or continue with Google
          </p>
        </div>

        <form onSubmit={isOtpSent ? handleVerifyOtp : (e) => { e.preventDefault(); handleSendOtp(); }} className="space-y-6 my-auto max-w-sm mx-auto w-full">
          {/* Role Choice */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
              I want to use HALDER as:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedRole('customer')}
                className={`p-4 rounded-2xl border text-center transition-all ${
                  selectedRole === 'customer'
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1B201D] text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <div className="p-2 rounded-xl bg-emerald-100/60 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 w-fit mx-auto mb-1.5">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div className="font-bold text-sm">Customer</div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Buy fresh farm food
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('farmer')}
                className={`p-4 rounded-2xl border text-center transition-all ${
                  selectedRole === 'farmer'
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1B201D] text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <div className="p-2 rounded-xl bg-amber-100/60 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 w-fit mx-auto mb-1.5">
                  <Sprout className="w-6 h-6" />
                </div>
                <div className="font-bold text-sm">Farmer</div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Sell your harvest
                </div>
              </button>
            </div>
          </div>

          {/* Dynamic 2-Step Real SMS OTP Verification */}
          <div className="space-y-4 bg-white dark:bg-[#1B201D] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-soft">
            {!isOtpSent ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    Mobile Number (मोबाइल नंबर)
                  </label>
                  <div className="flex gap-2">
                    <span className="inline-flex items-center px-3 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl text-sm font-medium">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      placeholder="10-digit mobile number"
                      maxLength={10}
                      className="flex-1 px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isSendingOtp || mobileNumber.length < 10}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
                >
                  {isSendingOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending OTP SMS...</span>
                    </>
                  ) : (
                    <>
                      <span>Send OTP (ओटीपी भेजें)</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-500/20 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">+91 {mobileNumber}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOtpSent(false);
                      setOtp('');
                    }}
                    className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold underline hover:opacity-80"
                  >
                    Change
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      Enter 6-Digit OTP (ओटीपी दर्ज करें)
                    </label>
                    {devOtp && (
                      <button
                        type="button"
                        onClick={() => setOtp(devOtp)}
                        className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded cursor-pointer"
                      >
                        Paste Dev OTP: {devOtp}
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    autoFocus
                    className="w-full text-center tracking-[0.4em] text-lg font-black py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                    {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Did not receive SMS?'}
                  </span>
                  <button
                    type="button"
                    disabled={cooldown > 0 || isSendingOtp}
                    onClick={handleSendOtp}
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold disabled:opacity-40 flex items-center gap-1 hover:underline"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Resend OTP
                  </button>
                </div>

                <button
                  type="submit"
                  onClick={handleVerifyOtp}
                  disabled={isVerifyingOtp || otp.length < 4}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-soft-lg"
                >
                  {isVerifyingOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify & Enter HALDER</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="relative flex py-0.5 items-center">
            <div className="grow border-t border-zinc-200 dark:border-zinc-800"></div>
            <span className="shrink mx-3 text-zinc-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-wider">or</span>
            <div className="grow border-t border-zinc-200 dark:border-zinc-800"></div>
          </div>

          {/* Real Google Sign-In */}
          <GoogleSignInButton
            role={selectedRole}
            onSuccess={(credential) => {
              loginWithGoogle(credential, selectedRole);
              if (onClose) onClose();
            }}
          />

          <button
            type="button"
            onClick={() => {
              loginUser(selectedRole, '9876543210');
              if (onClose) onClose();
            }}
            className="w-full py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl transition-all text-center block"
          >
            🌱 Seedha Bazaar Dekhein (Explore as Guest)
          </button>
        </form>

        <p className="text-center text-[11px] text-zinc-400 dark:text-zinc-500 pb-2">
          By continuing, you agree to HALDER's{' '}
          <a
            href="/terms.html"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold"
          >
            Fair-Trade Terms
          </a>{' '}
          &{' '}
          <a
            href="/privacy.html"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold"
          >
            Privacy Policy
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-[#F7F9F6] dark:bg-[#0F1411] max-w-lg mx-auto select-none transition-colors overflow-y-auto">
      {/* Top Bar with Sign In, Dots, and Skip */}
      <div className="flex items-center justify-between p-4 sm:p-5 shrink-0">
        <div className="flex items-center gap-1.5">
          {slides.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentSlide
                  ? 'w-7 bg-emerald-600 dark:bg-emerald-400'
                  : 'w-2 bg-zinc-200 dark:bg-zinc-800'
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowRolePick(true)}
            className="text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:text-emerald-700 bg-white dark:bg-[#1B201D] border border-zinc-200 dark:border-zinc-700 px-3 py-1 rounded-full shadow-2xs transition-all"
          >
            Sign In / साइन इन
          </button>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => loginUser('customer', '9876543210')}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 px-3 py-1 rounded-full border border-emerald-500/30 transition-all"
            >
              Skip →
            </button>
          )}
        </div>
      </div>

      {/* Main Slide Content */}
      <div className="px-6 flex-1 flex flex-col justify-center items-center text-center space-y-5 my-auto">
        {/* Image Card */}
        <div className="relative w-full max-w-xs aspect-4/3 rounded-3xl overflow-hidden shadow-soft-lg border border-zinc-200/80 dark:border-zinc-800">
          <img
            src={slide.image}
            alt={slide.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <span className="text-[11px] font-bold text-white bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
              {slide.stat}
            </span>
            <div className="p-2 bg-emerald-600 text-white rounded-full">
              <Icon className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="space-y-2 max-w-sm">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            {slide.badge}
          </span>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white leading-tight">
            {slide.title}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {slide.description}
          </p>
        </div>
      </div>

      {/* Bottom Action Area: Direct Google Login & Carousel Navigation */}
      <div className="p-5 space-y-2.5 shrink-0 max-w-sm mx-auto w-full">
        {/* Primary Continue Button */}
        <button
          type="button"
          onClick={handleNext}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-sm rounded-2xl shadow-soft transition-all flex items-center justify-center gap-2"
        >
          <span>{currentSlide === slides.length - 1 ? 'Start Shopping' : 'Continue'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* PROMINENT DIRECT GOOGLE SIGN-IN BUTTON */}
        <div className="w-full">
          <GoogleSignInButton
            role={selectedRole}
            onSuccess={(credential) => {
              loginWithGoogle(credential, selectedRole);
              if (onClose) onClose();
            }}
          />
        </div>

        <div className="flex items-center justify-between text-xs px-1 pt-0.5">
          <button
            type="button"
            onClick={() => setShowRolePick(true)}
            className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            📱 Mobile OTP Login
          </button>
          <button
            type="button"
            onClick={() => {
              loginUser('customer', '9876543210');
              if (onClose) onClose();
            }}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            Explore as Guest →
          </button>
        </div>
      </div>
    </div>
  );
};
