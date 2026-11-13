import React, { useState, useRef } from 'react';
import { ApiClient } from '../../api/client';
import { compressImageFile } from '../../utils/imageCompression';
import { X, Camera, Loader2, Check, AlertCircle, Sparkles } from 'lucide-react';

interface EditFarmerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: any;
  onProfileUpdated: (updated: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const EditFarmerProfileModal: React.FC<EditFarmerProfileModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onProfileUpdated,
  showToast,
}) => {
  const [farmName, setFarmName] = useState(currentProfile?.farmName || '');
  const [description, setDescription] = useState(currentProfile?.description || '');
  const [location, setLocation] = useState(currentProfile?.location || '');
  const [city, setCity] = useState(currentProfile?.city || 'Dehradun');
  const [farmSizeAcres, setFarmSizeAcres] = useState(currentProfile?.farmSizeAcres || 5);
  const [waterSource, setWaterSource] = useState(currentProfile?.waterSource || 'Natural Rainwater & Deep Aquifer');
  const [experienceYears, setExperienceYears] = useState(currentProfile?.experienceYears || 10);
  const [avatarPreview, setAvatarPreview] = useState(currentProfile?.avatar || '');
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

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
      showToast('⚡ Compressing farm photo...', 'info');
      const res = await compressImageFile(file, { lowBandwidthMode: true, maxDimension: 800 });
      setAvatarPreview(res.dataUrl);
      setAvatarBase64(res.dataUrl);
      showToast(`Photo compressed! Saved ${res.savingsPercent}% data (${res.compressedFormatted})`, 'success');
    } catch {
      setError('Failed to process image. Please try again.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmName.trim() || !location.trim()) {
      setError('Farm name and location are required.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (avatarBase64) {
        await ApiClient.uploadFarmerAvatar(avatarBase64);
      }

      const updated = await ApiClient.updateFarmerProfile({
        farmName: farmName.trim(),
        description: description.trim(),
        location: location.trim(),
        city: city.trim(),
        farmSizeAcres: Number(farmSizeAcres),
        waterSource: waterSource.trim(),
        experienceYears: Number(experienceYears),
      });

      showToast('Farmer farm profile updated successfully!', 'success');
      onProfileUpdated(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update farmer profile.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-[#1B201D] w-full max-w-md rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-white">
                Edit Farmer Farm Details (फ़ार्म जानकारी बदलें)
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Update your public farm presentation & story
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
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
                  alt="Farmer Avatar"
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-black text-2xl flex items-center justify-center border-2 border-emerald-600/30">
                  🌾
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
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Tap photo to change (Max 5MB • JPG, PNG, WebP)
            </span>
          </div>

          {/* Farm / Business Name */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Farm / Estate Name (खेत का नाम) *
            </label>
            <input
              type="text"
              required
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g. Green Valley Farm"
            />
          </div>

          {/* Farm Bio / Story */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Farm Story / Description (फ़ार्म परिचय)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 resize-none"
              placeholder="e.g. 100% pesticide-free organic farming in the foothills of Mussoorie"
            />
          </div>

          {/* Location & City */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Farming Region *
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. Sarjapur Agro Belt"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                City / District *
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500"
                placeholder="Dehradun"
              />
            </div>
          </div>

          {/* Farm Size & Experience */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Farm Area (Acres)
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={farmSizeAcres}
                onChange={(e) => setFarmSizeAcres(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500"
                placeholder="8.5"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Experience (Years)
              </label>
              <input
                type="number"
                min="1"
                value={experienceYears}
                onChange={(e) => setExperienceYears(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500"
                placeholder="10"
              />
            </div>
          </div>

          {/* Water Source */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Irrigation / Water Source
            </label>
            <input
              type="text"
              value={waterSource}
              onChange={(e) => setWaterSource(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500"
              placeholder="Natural Rainwater & Deep Aquifer"
            />
          </div>

          {/* Permanent HALDER Farmer ID */}
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-zinc-400">
              HALDER Farmer ID
            </span>
            <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
              {currentProfile?.halderId || 'HAL-FRM-00000001'}
            </span>
          </div>

          {/* Actions */}
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
                  <span>Save Farm Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
