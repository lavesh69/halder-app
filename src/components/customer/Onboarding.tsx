import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ArrowRight, Sprout, ShieldCheck, HeartHandshake, Loader2, X, ShoppingBag, User as UserIcon, Mail, Lock, Phone } from 'lucide-react';
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
  const { setHasSeenOnboarding, setIsLoggedIn, setAuthenticatedSession, loginUser, loginWithGoogle, showToast, signup, login } = useApp();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showRolePick, setShowRolePick] = useState(initialShowLogin);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'verify'>('request');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [realName, setRealName] = useState('');
  const [username, setUsername] = useState('');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [realEmail, setRealEmail] = useState('');
  const [realPhone, setRealPhone] = useState('');
  const [realPassword, setRealPassword] = useState('');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'customer' | 'farmer'>('customer');

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      showToast('Please enter your email address', 'error');
      return;
    }
    setIsSubmittingAuth(true);
    try {
      const res = await ApiClient.forgotPassword(forgotEmail.trim().toLowerCase());
      const code = res?.data?.code || res?.code || '';
      const token = res?.data?.resetToken || res?.resetToken || '';
      setForgotCode(code);
      setInputCode(code); // Pre-fill for instantaneous convenience
      setResetToken(token);
      setForgotStep('verify');
      showToast(`Verification code: ${code}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to request password reset. Check email.', 'error');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) {
      showToast('Please enter the 6-digit verification code', 'error');
      return;
    }
    if (!newPassword.trim() || newPassword.trim().length < 6) {
      showToast('New password must be at least 6 characters', 'error');
      return;
    }
    setIsSubmittingAuth(true);
    try {
      const res = await ApiClient.resetPassword({
        email: forgotEmail.trim().toLowerCase(),
        code: inputCode.trim(),
        newPassword: newPassword.trim(),
        resetToken: resetToken || undefined,
      });
      const user = res?.data?.user || res?.user;
      const token = res?.data?.token || res?.token;
      if (token) ApiClient.setToken(token);
      login(user?.email || forgotEmail.trim().toLowerCase(), user?.role || selectedRole);
      showToast('Password reset successfully! Logged in.', 'success');
      setIsForgotMode(false);
      if (onClose) onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to reset password. Please check the code.', 'error');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!realPassword.trim()) {
      showToast('Please enter your password', 'error');
      return;
    }

    setIsSubmittingAuth(true);
    try {
      if (isRegisterMode) {
        if (!username.trim()) {
          showToast('Please enter a unique username (e.g. @kisan_ramesh)', 'error');
          setIsSubmittingAuth(false);
          return;
        }
        const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
        if (!/^[a-z0-9_.-]{3,30}$/.test(cleanUsername)) {
          showToast('Username must be 3-30 letters, numbers, dot, or underscore', 'error');
          setIsSubmittingAuth(false);
          return;
        }
        if (!realName.trim()) {
          showToast('Please enter your full name', 'error');
          setIsSubmittingAuth(false);
          return;
        }
        if (!realEmail.trim()) {
          showToast('Please enter your email address', 'error');
          setIsSubmittingAuth(false);
          return;
        }
        const res: any = await ApiClient.register({
          username: cleanUsername,
          name: realName.trim(),
          email: realEmail.trim().toLowerCase(),
          phone: realPhone.trim() || `+91 ${Math.floor(6000000000 + Math.random() * 3000000000)}`,
          password: realPassword,
          role: selectedRole,
        });
        if (res?.token) ApiClient.setToken(res.token);
        signup(
          res?.user?.name || realName.trim(),
          res?.user?.email || realEmail.trim().toLowerCase(),
          res?.user?.phone || realPhone.trim() || '+91 98765 43210',
          selectedRole
        );
        showToast(`Welcome, @${cleanUsername}! Account successfully created.`, 'success');
      } else {
        const idToLogin = loginIdentifier.trim() || realEmail.trim();
        if (!idToLogin) {
          showToast('Please enter your username or email', 'error');
          setIsSubmittingAuth(false);
          return;
        }
        const res: any = await ApiClient.login(idToLogin, realPassword);
        const user = res?.user || res?.data?.user;
        const token = res?.token || res?.data?.token;
        if (user) {
          setAuthenticatedSession(user, token);
        } else {
          login(idToLogin, selectedRole);
          setHasSeenOnboarding(true);
          setIsLoggedIn(true);
        }
        showToast(`Welcome back, ${user?.name || user?.username || idToLogin}!`, 'success');
      }
      setHasSeenOnboarding(true);
      setIsLoggedIn(true);
      if (onClose) onClose();
    } catch (err: any) {
      if (err.status === 409 || err.message?.includes('already taken')) {
        showToast('This username or email is already taken. Please choose another.', 'error');
      } else {
        showToast(err.message || 'Authentication failed. Please check your credentials.', 'error');
      }
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      setShowRolePick(true);
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
            Sign in with your email or continue with Google
          </p>
        </div>

        <form onSubmit={handleAccountSubmit} className="space-y-4 my-auto max-w-sm mx-auto w-full">
          {/* Role Choice - Only displayed during Registration */}
          {isRegisterMode && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                I want to register as (खाता प्रकार):
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedRole('customer')}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    selectedRole === 'customer'
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1B201D] text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="p-1.5 rounded-xl bg-emerald-100/60 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 w-fit mx-auto mb-1">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div className="font-bold text-xs">Customer (ग्राहक)</div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    Buy fresh farm food
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('farmer')}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    selectedRole === 'farmer'
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1B201D] text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="p-1.5 rounded-xl bg-amber-100/60 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 w-fit mx-auto mb-1">
                    <Sprout className="w-5 h-5" />
                  </div>
                  <div className="font-bold text-xs">Farmer (किसान)</div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    Sell your harvest
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Account Login / Registration Form */}
          {isForgotMode ? (
            <div className="space-y-3 bg-white dark:bg-[#1B201D] p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-soft">
              <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-2 mb-1">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  🔐 Reset Password (पासवर्ड रीसेट)
                </span>
                <button
                  type="button"
                  onClick={() => setIsForgotMode(false)}
                  className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  ← Back to Sign In
                </button>
              </div>

              {forgotStep === 'request' ? (
                <div className="space-y-3">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Enter your account email to receive a 6-digit recovery code.
                  </p>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                      Email Address (ईमेल पता) *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="e.g. you@gmail.com"
                        className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleForgotRequest}
                    disabled={isSubmittingAuth}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
                  >
                    {isSubmittingAuth ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Code...</span>
                      </>
                    ) : (
                      <>
                        <span>Get Reset Code (कोड प्राप्त करें)</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {forgotCode && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center">
                      <div className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300">
                        Your Verification Code (सत्यापन कोड):
                      </div>
                      <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 tracking-widest mt-0.5">
                        {forgotCode}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                      6-Digit Code (सत्यापन कोड) *
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value)}
                      placeholder="123456"
                      className="w-full px-3 py-2 text-center text-lg font-bold tracking-widest bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                      New Password (नया पासवर्ड) *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetSubmit}
                    disabled={isSubmittingAuth}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
                  >
                    {isSubmittingAuth ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <span>Reset Password & Enter</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
          <div className="space-y-3 bg-white dark:bg-[#1B201D] p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-soft">
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-2 mb-1">
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                {isRegisterMode ? '✨ Create Account' : '🔑 Sign In'}
              </span>
                <button
                  type="button"
                  onClick={() => setIsRegisterMode(!isRegisterMode)}
                  className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  {isRegisterMode ? 'Already have account? Sign In' : 'New user? Register free'}
                </button>
              </div>

              {isRegisterMode && (
                <>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                        Unique Username (यूज़रनेम / ID) *
                      </label>
                      <span className="text-[10px] text-zinc-400 font-mono">@unique</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-sm font-bold text-emerald-600 dark:text-emerald-400 select-none">
                        @
                      </span>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                        placeholder="e.g. kisan_ramesh or aman_s"
                        className="w-full pl-8 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-medium"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-400">
                      3-30 letters, numbers, dot, or underscore. Permanent profile handle.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                      Your Full Name (आपका पूरा नाम) *
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={realName}
                        onChange={(e) => setRealName(e.target.value)}
                        placeholder="e.g. Lavesh Dobriyal"
                        className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                      />
                    </div>
                  </div>
                </>
              )}

              {!isRegisterMode ? (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    Username or Email (यूज़रनेम या ईमेल) *
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="Enter username (e.g. admin or kisan_ramesh)"
                      className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    Email Address (ईमेल पता) *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={realEmail}
                      onChange={(e) => setRealEmail(e.target.value)}
                      placeholder="e.g. you@gmail.com"
                      className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>
                </div>
              )}

              {isRegisterMode && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    Phone Number (मोबाइल नंबर)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      value={realPhone}
                      onChange={(e) => setRealPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    Password (पासवर्ड) *
                  </label>
                  {!isRegisterMode && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotMode(true);
                        setForgotStep('request');
                        setForgotEmail(realEmail);
                      }}
                      className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                    >
                      Forgot? (पासवर्ड भूल गए?)
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={realPassword}
                    onChange={(e) => setRealPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingAuth}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-sm mt-1"
              >
                {isSubmittingAuth ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>{isRegisterMode ? 'Create Account & Enter' : 'Sign In to HALDER'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

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
              loginUser(selectedRole);
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
              onClick={() => loginUser('customer')}
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
            🔑 Sign In / Register
          </button>
          <button
            type="button"
            onClick={() => {
              loginUser('customer');
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
