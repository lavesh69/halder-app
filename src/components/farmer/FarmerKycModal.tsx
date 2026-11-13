import React, { useState, useEffect, useRef } from 'react';
import { compressImageFile } from '../../utils/imageCompression';
import {
  X,
  ShieldCheck,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Upload,
  Camera,
  Image as ImageIcon,
  Check,
} from 'lucide-react';
import { ApiClient } from '../../api/client';

interface FarmerKycModalProps {
  isOpen: boolean;
  onClose: () => void;
  farmerId: string;
  onSuccess?: () => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

const DOCUMENT_PRESETS = [
  {
    type: 'aadhaar',
    name: 'Aadhaar Card (UIDAI)',
    num: '5420-9182-4412',
    url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80',
  },
  {
    type: 'land_record',
    name: '7/12 Land Record (सातबारा)',
    num: 'MH-PUN-712-4091',
    url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
  },
  {
    type: 'kisan_credit_card',
    name: 'Kisan Credit Card (KCC)',
    num: 'KCC-SBI-9840129',
    url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
  },
];

export const FarmerKycModal: React.FC<FarmerKycModalProps> = ({
  isOpen,
  onClose,
  farmerId,
  onSuccess,
  showToast,
}) => {
  const [docType, setDocType] = useState<string>('aadhaar');
  const [docNumber, setDocNumber] = useState('5420-9182-4412');
  const [docUrl, setDocUrl] = useState(DOCUMENT_PRESETS[0].url);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [statusData, setStatusData] = useState<{
    verificationStatus: 'pending' | 'verified' | 'rejected' | string;
    documentType: string | null;
    documentNumber: string | null;
    rawDocumentNumber?: string | null;
    documentUrl: string | null;
    submittedAt: string | null;
    reviewedAt: string | null;
    rejectionReason: string | null;
  } | null>(null);

  const loadStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const res = await ApiClient.getFarmerKYC(farmerId);
      if (res?.data) {
        setStatusData(res.data);
        if (res.data.documentType) setDocType(res.data.documentType);
        if (res.data.rawDocumentNumber) setDocNumber(res.data.rawDocumentNumber);
        if (res.data.documentUrl) setDocUrl(res.data.documentUrl);
      }
    } catch {
      // Ignore initial load error if new profile
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    }
  }, [isOpen, farmerId]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
      setError('Please select a valid image (JPEG, PNG, WebP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError('Document file size must be less than 8 MB.');
      return;
    }

    setError(null);
    try {
      showToast('⚡ Compressing KYC document for secure verification...', 'info');
      const res = await compressImageFile(file, { lowBandwidthMode: true, maxDimension: 1400 });
      setDocUrl(res.dataUrl);
      showToast(`Document compressed! Saved ${res.savingsPercent}% data (${res.compressedFormatted})`, 'success');
    } catch {
      setError('Failed to process document image. Please try again.');
    }
  };

  const handleApplyPreset = (preset: typeof DOCUMENT_PRESETS[0]) => {
    setDocType(preset.type);
    setDocNumber(preset.num);
    setDocUrl(preset.url);
    showToast(`Loaded ${preset.name} document sample`, 'info');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!docNumber.trim() || docNumber.trim().length < 4) {
      setError('Please enter a valid document identifier or number (min 4 characters)');
      return;
    }

    if (!docUrl.trim()) {
      setError('Please provide or capture your document photo certificate');
      return;
    }

    setIsSubmitting(true);
    try {
      await ApiClient.submitFarmerKYC(farmerId, {
        documentType: docType,
        documentNumber: docNumber.trim(),
        documentUrl: docUrl.trim(),
      });

      showToast('📄 KYC Documents submitted for verification!', 'success');
      loadStatus();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to submit KYC documents');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isVerified = statusData?.verificationStatus === 'verified';
  const isPending = statusData?.verificationStatus === 'pending' && Boolean(statusData?.submittedAt);
  const isRejected = statusData?.verificationStatus === 'rejected';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div
        className="w-full max-w-lg bg-white dark:bg-[#1B201D] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-slide-up max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                Farmer KYC & Mandi Certification (किसान पहचान सत्यापन)
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Official Kisan verification to earn the Green Verified trust mark
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Status Banner */}
          {isVerified && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-start gap-3 text-emerald-900 dark:text-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold block text-sm">Verified Certified Kisan (सत्यापित किसान 🛡️)</span>
                <p className="mt-0.5 text-emerald-800 dark:text-emerald-300">
                  Your identity and land credentials have been verified by the Compliance Admin. All your produce listings proudly carry the Green Verified Badge.
                </p>
                {statusData?.documentNumber && (
                  <span className="text-[11px] font-mono mt-1 block opacity-80">
                    ID: {statusData.documentNumber} ({statusData.documentType?.toUpperCase()})
                  </span>
                )}
              </div>
            </div>
          )}

          {isPending && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl flex items-start gap-3 text-amber-900 dark:text-amber-200">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold block text-sm">KYC Under Verification (सत्यापन समीक्षाधीन)</span>
                <p className="mt-0.5 text-amber-800 dark:text-amber-300">
                  Your submitted proof documents are in the Admin Verification Queue. Approvals are reviewed promptly.
                </p>
                <span className="text-[11px] text-zinc-500 mt-1 block">
                  Submitted: {statusData?.submittedAt ? new Date(statusData.submittedAt).toLocaleString() : 'Recently'}
                </span>
              </div>
            </div>
          )}

          {isRejected && (
            <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 rounded-2xl flex items-start gap-3 text-red-900 dark:text-red-200">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold block text-sm">Verification Needs Attention (अस्वीकृत)</span>
                <p className="mt-0.5 text-red-800 dark:text-red-300 font-semibold">
                  Admin Feedback: "{statusData?.rejectionReason || 'Document details were unclear or unreadable.'}"
                </p>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1">
                  Please review the guidelines below and re-submit a clear proof document.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          {(!isVerified || isRejected) && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Document Type Selector */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  1. Select Verification Document (पहचान पत्र प्रकार)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'aadhaar', label: 'Aadhaar Card', desc: 'UIDAI 12-digit UID' },
                    { id: 'land_record', label: 'Land Record (7/12)', desc: 'Saat-Baara / Khasra' },
                    { id: 'kisan_credit_card', label: 'Kisan Credit Card', desc: 'KCC / Bank Passbook' },
                    { id: 'farmer_id', label: 'Govt Kisan ID', desc: 'State Agri Department' },
                  ].map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setDocType(doc.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        docType === doc.id
                          ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 shadow-xs ring-1 ring-emerald-500'
                          : 'border-zinc-200 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50'
                      }`}
                    >
                      <span className="font-bold text-xs block">{doc.label}</span>
                      <span className="text-[10px] text-zinc-400 block">{doc.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Document Number */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  2. Document / Certificate Number (दस्तावेज़ संख्या)
                </label>
                <input
                  type="text"
                  required
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder="e.g. 5420-9182-4412 or MH-PUN-712-4091"
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Document Photo Upload & Presets */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  3. Upload Document Certificate / Photo (फ़ोटो या प्रमाण पत्र)
                </label>

                {/* Upload Button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-3 px-4 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl flex items-center justify-center gap-2 hover:border-emerald-500 hover:bg-emerald-50/40 transition cursor-pointer text-xs font-bold text-zinc-700 dark:text-zinc-200"
                  >
                    <Camera className="w-4 h-4 text-emerald-600" />
                    <span>Upload from Phone Camera / Files</span>
                  </button>
                </div>

                {/* Preset Fast Picks */}
                <div className="pt-2">
                  <span className="text-[10px] text-zinc-400 block mb-1">Or choose a simulated official sample:</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {DOCUMENT_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition ${
                          docUrl === preset.url
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200'
                        }`}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Document Preview Thumbnail */}
                {docUrl && (
                  <div className="mt-2.5 p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center gap-3">
                    <img
                      src={docUrl}
                      alt="KYC Preview"
                      className="w-14 h-14 rounded-lg object-cover border border-zinc-300 dark:border-zinc-600 shrink-0"
                    />
                    <div className="min-w-0 flex-1 text-[11px]">
                      <span className="font-bold text-zinc-900 dark:text-white block truncate">
                        Document Proof Ready
                      </span>
                      <span className="text-zinc-400 text-[10px] block truncate">
                        {docNumber} • {docType.toUpperCase()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    <span>Submitting...</span>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Submit for Verification (जमा करें)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {isVerified && (
            <div className="pt-2 text-center">
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-emerald-700 transition"
              >
                Close (बंद करें)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
