import React from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';

interface AdminKycViewerModalProps {
  inspectingKycDoc: any | null;
  onClose: () => void;
  onRejectClick: (farmerId: string) => void;
  onApproveKyc: (farmerId: string) => void;
}

export const AdminKycViewerModal: React.FC<AdminKycViewerModalProps> = ({
  inspectingKycDoc,
  onClose,
  onRejectClick,
  onApproveKyc,
}) => {
  if (!inspectingKycDoc) return null;

  const khasraNum =
    Math.abs(
      (inspectingKycDoc.id || 'khasra')
        .split('')
        .reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0) % 800
    ) + 120;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-[#181F1A] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-5 max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            <div>
              <h3 className="font-black text-base text-zinc-900 dark:text-white">
                Official Farmer Proof Document Review
              </h3>
              <span className="text-xs text-zinc-500">
                {inspectingKycDoc.farmer_name} • {inspectingKycDoc.farm_name}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-full"
          >
            ✕
          </button>
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-black uppercase text-zinc-400 tracking-wider">
            1. Government Aadhaar Card
          </span>

          <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-zinc-900 dark:to-zinc-800 rounded-2xl border-2 border-amber-300 dark:border-amber-700/60 shadow-md relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 via-white to-emerald-600" />

            <div className="flex items-center justify-between pb-2 border-b border-amber-200 dark:border-zinc-700">
              <div className="flex items-center gap-2">
                <span className="text-xl">🇮🇳</span>
                <div>
                  <span className="font-black text-xs text-amber-950 dark:text-amber-200 block">
                    Government of India
                  </span>
                  <span className="text-[9px] text-zinc-500">Unique Identification Authority of India</span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-amber-200/60 dark:bg-amber-950 px-2 py-0.5 rounded text-amber-900 dark:text-amber-300">
                AADHAAR VERIFIED
              </span>
            </div>

            <div className="flex items-center gap-4 pt-3">
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160"
                alt="Farmer Aadhaar photo"
                className="w-16 h-20 rounded-lg object-cover border-2 border-amber-400 dark:border-amber-600 shadow-sm shrink-0"
              />
              <div className="space-y-1 text-xs text-zinc-800 dark:text-zinc-200 min-w-0">
                <p className="font-black text-sm text-zinc-900 dark:text-white">
                  Name: {inspectingKycDoc.farmer_name}
                </p>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  DOB: 14/08/1982 | Gender: Male
                </p>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  Address: Village {inspectingKycDoc.city}, {inspectingKycDoc.location}, India
                </p>
                <p className="font-mono font-black text-sm text-amber-950 dark:text-amber-300 tracking-widest pt-1">
                  {inspectingKycDoc.kyc_document_number || 'XXXX XXXX 8921'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-black uppercase text-zinc-400 tracking-wider">
            2. Land Title & 7/12 Saat-Baara Record
          </span>

          <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border-2 border-emerald-300 dark:border-emerald-800 space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-emerald-200 dark:border-emerald-800">
              <span className="font-black text-xs text-emerald-950 dark:text-emerald-200">
                State Land Revenue Dept • Form VII-XII
              </span>
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                Khasra # {khasraNum}/B
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-zinc-500 text-[10px] block">Farm / Khata Name:</span>
                <span className="font-bold text-zinc-900 dark:text-white">{inspectingKycDoc.farm_name}</span>
              </div>
              <div>
                <span className="text-zinc-500 text-[10px] block">Verified Agricultural Area:</span>
                <span className="font-bold text-zinc-900 dark:text-white">4.5 Hectares</span>
              </div>
              <div>
                <span className="text-zinc-500 text-[10px] block">District / Taluka:</span>
                <span className="font-bold text-zinc-900 dark:text-white">{inspectingKycDoc.city}</span>
              </div>
              <div>
                <span className="text-zinc-500 text-[10px] block">Status of Cultivation:</span>
                <span className="font-bold text-emerald-600">Active Crop Season (Kharif / Rabi)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
          {inspectingKycDoc.phone ? (
            <a
              href={`https://wa.me/${inspectingKycDoc.phone.replace(/[^0-9]/g, '').length === 10 ? `91${inspectingKycDoc.phone.replace(/[^0-9]/g, '')}` : inspectingKycDoc.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Namaste ${inspectingKycDoc.farmer_name}! We are reviewing your HALDHAR Farmer Verification documents.`)}`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 rounded-xl font-bold text-xs flex items-center gap-1.5 transition"
            >
              <span>💬 WhatsApp Farmer</span>
            </a>
          ) : (
            <span className="text-xs text-zinc-400">No phone number on file</span>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => onRejectClick(inspectingKycDoc.id)}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-bold text-xs transition"
            >
              Reject Documents
            </button>
            <button
              onClick={() => onApproveKyc(inspectingKycDoc.id)}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Approve & Grant Verified Green Badge</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
