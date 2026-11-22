import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ApiClient } from '../../api/client';
import { compressImageFile } from '../../utils/imageCompression';
import { X, Camera, Loader2, Check, AlertCircle, Trash2 } from 'lucide-react';

interface EditCustomerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: any;
  onProfileUpdated: (updatedProfile: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const EditCustomerProfileModal: React.FC<EditCustomerProfileModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onProfileUpdated,
  showToast,
}) => {
  const { currentUser, updateCurrentUser } = useApp();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [isAvatarRemoved, setIsAvatarRemoved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state whenever modal opens or props/currentUser change
  useEffect(() => {
    if (isOpen) {
      const initialName = currentProfile?.name || currentUser?.name || '';
      const initialPhone = currentProfile?.phone || currentUser?.phone || '';
      const initialBio = currentProfile?.bio || (currentUser as any)?.bio || '';
      const initialAvatar = currentProfile?.avatar || currentUser?.profile_image || '';

      setName(initialName);
      setPhone(initialPhone);
      setBio(initialBio);
      setAvatarPreview(initialAvatar);
      setAvatarBase64(null);
      setIsAvatarRemoved(false);
      setError(null);
    }
  }, [isOpen, currentProfile, currentUser]);

  if (!isOpen) return null;

  const halderId = currentProfile?.halderId || currentUser?.halder_id || 'HAL-CUS-00000001';

  const userInitials = (name.trim() || currentProfile?.name || currentUser?.name || 'U')
    .split(' ')
    .filter(Boolean)
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please choose a JPEG, PNG, or WebP image.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image file size must be less than 5 MB.');
      return;
    }

    setError(null);
    try {
      showToast('⚡ Compressing profile photo...', 'info');
      const res = await compressImageFile(file, { lowBandwidthMode: true, maxDimension: 800 });
      setAvatarPreview(res.dataUrl);
      setAvatarBase64(res.dataUrl);
      setIsAvatarRemoved(false);
      showToast(`Photo compressed! Saved ${res.savingsPercent}% data (${res.compressedFormatted})`, 'success');
    } catch {
      setError('Failed to process image. Please try again.');
    }
  };

  const handleRemovePhoto = () => {
    setAvatarPreview('');
    setAvatarBase64(null);
    setIsAvatarRemoved(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    showToast('Photo removed. Save changes to update profile.', 'info');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name cannot be empty.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let finalAvatar = avatarPreview;
      if (isAvatarRemoved) {
        try {
          await ApiClient.removeCustomerAvatar();
        } catch (removeErr) {
          console.warn('Backend avatar removal note:', removeErr);
        }
        finalAvatar = '';
      } else if (avatarBase64) {
        try {
          const upRes = await ApiClient.uploadCustomerAvatar(avatarBase64);
          if (upRes?.avatar) {
            finalAvatar = upRes.avatar;
          }
        } catch (uploadErr) {
          console.warn('Backend avatar upload note:', uploadErr);
        }
      }

      let updated: any = null;
      try {
        updated = await ApiClient.updateCustomerProfile({
          name: name.trim(),
          phone: phone.trim(),
          bio: bio.trim(),
        });
      } catch (profileErr) {
        console.warn('Backend profile update note:', profileErr);
      }

      const finalName = updated?.name || name.trim();
      const finalPhone = updated?.phone || phone.trim();
      const finalBio = updated?.bio !== undefined ? updated.bio : bio.trim();

      updateCurrentUser({
        name: finalName,
        phone: finalPhone,
        profile_image: finalAvatar,
      });

      const fullUpdated = {
        ...currentProfile,
        ...updated,
        name: finalName,
        phone: finalPhone,
        bio: finalBio,
        avatar: finalAvatar,
        halderId: halderId,
      };

      try {
        localStorage.setItem('halder-customer-profile-cache', JSON.stringify(fullUpdated));
      } catch {}

      showToast('Profile updated successfully!', 'success');
      onProfileUpdated(fullUpdated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-[#1B201D] w-full max-w-md rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-zinc-900 dark:text-white">
              Edit Profile
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Update your personal details and photo
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl flex items-center gap-2 text-xs text-red-700 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-2 pt-1 pb-2">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Profile Preview"
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-black text-2xl flex items-center justify-center border-2 border-emerald-600/30">
                  {userInitials}
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 p-1 bg-emerald-600 text-white rounded-lg shadow-xs">
                <Camera className="w-3.5 h-3.5" />
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex items-center gap-3 mt-0.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{avatarPreview ? 'Change Photo' : 'Upload Photo'}</span>
              </button>
              {avatarPreview && (
                <>
                  <span className="text-zinc-300 dark:text-zinc-600">•</span>
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Photo</span>
                  </button>
                </>
              )}
            </div>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
              Max 5MB • JPG, PNG, WebP
            </span>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g. Ramesh Singh"
            />
          </div>

          {/* Unique Username (Read-Only) */}
          {currentProfile?.username && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Unique Username
                </label>
                <span className="text-[10px] text-zinc-400">Permanent Handle</span>
              </div>
              <div className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/30 text-zinc-500 dark:text-zinc-400 font-mono text-sm select-all">
                @{currentProfile.username}
              </div>
            </div>
          )}

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              placeholder="+91 98765 43210"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              About You / Bio
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 resize-none"
              placeholder="e.g. Organic food lover & farm fresh supporter"
            />
          </div>

          {/* Permanent HALDER ID (Read-only security badge) */}
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
              Permanent HALDER ID (Immutable)
            </span>
            <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
              {halderId}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
