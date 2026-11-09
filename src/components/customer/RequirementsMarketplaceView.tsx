import React, { useState, useEffect } from 'react';
import { BuyerRequirement, RequirementQuotation, ProductCategory } from '../../types';
import { ApiClient } from '../../api/client';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';
import {
  Megaphone,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  Send,
  Phone,
  MessageCircle,
  Truck,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  ShieldCheck,
  Tag,
  Star,
} from 'lucide-react';
import { PostRequirementModal } from './PostRequirementModal';

interface RequirementsMarketplaceViewProps {
  isOpen?: boolean;
  onClose?: () => void;
  standalone?: boolean;
}

export const RequirementsMarketplaceView: React.FC<RequirementsMarketplaceViewProps> = ({
  isOpen = true,
  onClose,
  standalone = false,
}) => {
  const { showToast, currentUser, role } = useApp();

  const [activeTab, setActiveTab] = useState<'all' | 'my_requirements' | 'my_quotations'>('all');
  const [requirements, setRequirements] = useState<BuyerRequirement[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);

  // Submit Quotation sub-modal state
  const [quotingRequirement, setQuotingRequirement] = useState<BuyerRequirement | null>(null);
  const [offeredPrice, setOfferedPrice] = useState<number | ''>('');
  const [offeredQuantity, setOfferedQuantity] = useState<number | ''>('');
  const [deliveryTerms, setDeliveryTerms] = useState('Farm pickup available');
  const [expectedDate, setExpectedDate] = useState('');
  const [quotationNotes, setQuotationNotes] = useState('');
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);

  // Expanded requirement ID for viewing received quotations
  const [expandedReqId, setExpandedReqId] = useState<string | null>(null);

  const fetchRequirements = async () => {
    try {
      setLoading(true);
      const res = await ApiClient.listRequirements({
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        status: 'open',
      });
      const list: BuyerRequirement[] = Array.isArray(res) ? res : (res as any).requirements || [];
      setRequirements(list);
    } catch (err: any) {
      showToast(err.message || 'Failed to load requirements', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, [selectedCategory]);

  if (!isOpen) return null;

  const currentUserId = currentUser?.id || 'demo-user';

  const myRequirements = requirements.filter((r) => r.buyerId === currentUserId);

  const filteredRequirements = (activeTab === 'my_requirements' ? myRequirements : requirements).filter((r) => {
    const matchesSearch =
      r.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.district && r.district.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.state && r.state.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const handleOpenQuotation = (req: BuyerRequirement) => {
    setQuotingRequirement(req);
    setOfferedPrice(req.targetPrice || '');
    setOfferedQuantity(req.quantity ?? req.requiredQuantity ?? '');
  };

  const handleSubmitQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotingRequirement) return;
    if (!offeredPrice || Number(offeredPrice) <= 0) {
      showToast('Please enter your quotation price per unit', 'error');
      return;
    }
    if (!offeredQuantity || Number(offeredQuantity) <= 0) {
      showToast('Please enter available quantity', 'error');
      return;
    }

    try {
      setIsSubmittingQuote(true);
      await ApiClient.submitQuotation(quotingRequirement.id, {
        offeredPrice: Number(offeredPrice),
        quantity: Number(offeredQuantity),
        deliveryTerms,
        expectedDate: expectedDate || undefined,
        notes: quotationNotes.trim() || undefined,
      });

      showToast(`Quotation sent to buyer for ${quotingRequirement.productName}!`, 'success');
      setQuotingRequirement(null);
      setOfferedPrice('');
      setQuotationNotes('');
      await fetchRequirements();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit quotation', 'error');
    } finally {
      setIsSubmittingQuote(false);
    }
  };

  const handleAcceptQuotation = async (quotationId: string, requirementId: string) => {
    try {
      await ApiClient.acceptQuotation(quotationId);
      showToast('Quotation accepted! Farm trade terms confirmed.', 'success');
      await fetchRequirements();
    } catch (err: any) {
      showToast(err.message || 'Failed to accept quotation', 'error');
    }
  };

  const content = (
    <div className="space-y-4 animate-fade-in">
      {/* Top Header / Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white">
              Buyer Demand & Quotations (मांग एवं कोटेशन)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
              Reverse Marketplace
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Buyers post agricultural requirements; local farmers reply with competitive quotations.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <button
            onClick={fetchRequirements}
            className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition"
            title="Refresh demand"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsPostModalOpen(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-soft transition active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Post Requirement</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 sm:flex-none px-5 py-3 text-xs font-bold border-b-2 transition flex items-center justify-center gap-2 ${
            activeTab === 'all'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Active Demands ({requirements.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('my_requirements')}
          className={`flex-1 sm:flex-none px-5 py-3 text-xs font-bold border-b-2 transition flex items-center justify-center gap-2 ${
            activeTab === 'my_requirements'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>My Requirements ({myRequirements.length})</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search crop requirements by name, mandi, or district..."
            className="w-full pl-10 pr-3.5 py-2.5 bg-white dark:bg-[#1B201D] border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500 shadow-2xs"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3.5 py-2.5 bg-white dark:bg-[#1B201D] border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500 shadow-2xs"
        >
          <option value="All">All Categories</option>
          <option value="Vegetables">Vegetables</option>
          <option value="Fruits">Fruits</option>
          <option value="Grains">Grains</option>
          <option value="Dairy">Dairy</option>
          <option value="Organic">Organic</option>
        </select>
      </div>

      {/* List of Requirements */}
      {loading ? (
        <div className="py-16 text-center text-xs text-zinc-400">Loading live agricultural demands...</div>
      ) : filteredRequirements.length === 0 ? (
        <div className="py-16 px-4 text-center bg-white dark:bg-[#1B201D] rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto text-2xl">
            📢
          </div>
          <div>
            <h4 className="font-bold text-sm text-zinc-900 dark:text-white">
              No matching agricultural demands found
            </h4>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              {activeTab === 'my_requirements'
                ? 'You have not posted any purchase requirements yet. Post one now to receive direct farmer quotations!'
                : 'Need fresh crops, grain bags, or dairy in bulk? Broadcast your requirement to local farmers!'}
            </p>
          </div>
          <button
            onClick={() => setIsPostModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-soft transition"
          >
            <Plus className="w-4 h-4" />
            <span>Post a Requirement</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredRequirements.map((req) => {
            const isMyReq = req.buyerId === currentUserId;
            const isExpanded = expandedReqId === req.id;
            const quotationsCount = req.quotations?.length || 0;

            return (
              <div
                key={req.id}
                className="bg-white dark:bg-[#1B201D] rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 p-4 sm:p-5 shadow-2xs hover:border-emerald-500/60 transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  {/* Top Meta Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                          {req.requirementCode}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                          {req.category}
                        </span>
                      </div>
                      <h3 className="text-base font-black text-zinc-900 dark:text-white mt-1.5">
                        {req.productName}
                      </h3>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 block">
                        {req.quantity} {req.unit}
                      </span>
                      {req.targetPrice && (
                        <span className="text-[11px] text-zinc-500 block">
                          Target: ₹{req.targetPrice}/{req.unit}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quality & Delivery Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-zinc-100 dark:border-zinc-800/60 mt-2">
                    <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{req.district || 'Local Mandi'}, {req.state || 'UP'}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                      <Truck className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span className="capitalize">{req.deliveryPreference?.replace('_', ' ') || 'Pickup'}</span>
                    </div>

                    {req.requiredDate && (
                      <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                        <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>Needed by: {req.requiredDate}</span>
                      </div>
                    )}

                    {req.qualityGrade && (
                      <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                        <Tag className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{req.qualityGrade}</span>
                      </div>
                    )}
                  </div>

                  {req.instructions && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/40 p-2.5 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 mt-2 italic">
                      &quot;{req.instructions}&quot;
                    </p>
                  )}
                </div>

                {/* Bottom Controls / Farmer Quote CTA */}
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <span className="font-bold text-zinc-900 dark:text-white">{quotationsCount}</span>
                    <span>quotes received</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* If buyer owns requirement: toggle quotation view */}
                    {isMyReq && quotationsCount > 0 && (
                      <button
                        onClick={() => setExpandedReqId(isExpanded ? null : req.id)}
                        className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition flex items-center gap-1"
                      >
                        <span>{isExpanded ? 'Hide' : 'Review'} Quotations</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    )}

                    {/* Farmer Action: Submit Quote */}
                    {!isMyReq && (
                      <button
                        onClick={() => handleOpenQuotation(req)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 active:scale-95"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit Quote (कोटेशन दें)</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Expandable Quotations list for Buyer */}
                {isExpanded && req.quotations && req.quotations.length > 0 && (
                  <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2.5">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Farmer Quotations:
                    </span>
                    {req.quotations.map((quote: RequirementQuotation) => {
                      const farmerPhoneClean = (quote.farmerPhone || '').replace(/[^0-9]/g, '');
                      return (
                        <div
                          key={quote.id}
                          className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-bold text-xs text-zinc-900 dark:text-white">
                                {quote.farmerName}
                              </h5>
                              <span className="text-[10px] font-bold text-amber-600 flex items-center gap-0.5">
                                <Star className="w-3 h-3 fill-amber-400" />
                                {quote.farmerRating || 4.8}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-zinc-200 dark:bg-zinc-700 font-mono">
                                {quote.quotationCode}
                              </span>
                            </div>
                            <div className="flex items-baseline gap-2 mt-1">
                              <span className="text-sm font-black text-emerald-600">
                                ₹{quote.offeredPrice}/{req.unit}
                              </span>
                              <span className="text-[11px] text-zinc-500">
                                Qty: {quote.quantity} {req.unit}
                              </span>
                            </div>
                            {quote.notes && (
                              <p className="text-[11px] text-zinc-500 mt-0.5">{quote.notes}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 self-end sm:self-center">
                            {farmerPhoneClean && (
                              <a
                                href={`tel:${farmerPhoneClean}`}
                                className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-800 dark:text-zinc-200 transition"
                                title="Call Farmer"
                              >
                                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                              </a>
                            )}
                            {farmerPhoneClean && (
                              <a
                                href={`https://wa.me/${farmerPhoneClean}?text=${encodeURIComponent(`Namaste ${quote.farmerName}, I received your quote of ₹${quote.offeredPrice}/${req.unit} for ${req.productName} on HALDER.`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 transition"
                                title="WhatsApp Farmer"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                              </a>
                            )}
                            {quote.status !== 'accepted' ? (
                              <button
                                onClick={() => handleAcceptQuotation(quote.id, req.id)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                              >
                                Accept Quote
                              </button>
                            ) : (
                              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Accepted
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Post Requirement Modal */}
      <PostRequirementModal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
        onCreated={() => {
          fetchRequirements();
          setActiveTab('my_requirements');
        }}
      />

      {/* Submit Farmer Quotation Sub-Modal */}
      {quotingRequirement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div
            className="w-full max-w-md bg-white dark:bg-[#1B201D] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-zinc-900 dark:text-white">
                    Submit Farmer Quotation (कोटेशन)
                  </h4>
                  <p className="text-[11px] text-zinc-500">
                    Direct proposal to buyer for {quotingRequirement.productName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setQuotingRequirement(null)}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitQuotation} className="p-5 space-y-4">
              <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-zinc-500">Requested:</span>
                  <span className="font-bold text-zinc-900 dark:text-white ml-1">
                    {quotingRequirement.quantity} {quotingRequirement.unit}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500">Target Budget:</span>
                  <span className="font-bold text-emerald-600 ml-1">
                    {quotingRequirement.targetPrice ? `₹${quotingRequirement.targetPrice}/${quotingRequirement.unit}` : 'Open'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Your Price / {quotingRequirement.unit} (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={offeredPrice}
                    onChange={(e) => setOfferedPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Quotation rate"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Available Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={offeredQuantity}
                    onChange={(e) => setOfferedQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder={`Quantity in ${quotingRequirement.unit}`}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Delivery / Pickup Terms
                </label>
                <input
                  type="text"
                  value={deliveryTerms}
                  onChange={(e) => setDeliveryTerms(e.target.value)}
                  placeholder="e.g. Farm pickup available, or door delivery by tomorrow"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Quality Note / Message to Buyer
                </label>
                <textarea
                  rows={2}
                  value={quotationNotes}
                  onChange={(e) => setQuotationNotes(e.target.value)}
                  placeholder="e.g. Freshly harvested A-grade wheat, zero moisture..."
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setQuotingRequirement(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingQuote}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-soft transition flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Quotation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  if (standalone) {
    return content;
  }

  // Modal variant
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-4xl bg-white dark:bg-[#1B201D] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[92vh] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-zinc-900 dark:text-white">
                Buyer Requirements & Quotations (मांग एवं कोटेशन)
              </h3>
              <p className="text-[11px] text-zinc-500">
                Reverse Marketplace: Broadcast your demand to local farmers for direct quotations
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {content}
        </div>
      </div>
    </div>
  );
};
