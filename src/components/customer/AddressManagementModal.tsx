import React, { useState, useEffect } from 'react';
import { ApiClient } from '../../api/client';
import { X, MapPin, Plus, Edit2, Trash2, CheckCircle2, Loader2, Home, Briefcase, Tag, AlertCircle } from 'lucide-react';

interface AddressManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddressSelected?: (address: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const DEFAULT_SEED_ADDRESSES = [
  {
    id: 'addr-seed-1',
    label: 'Home',
    name: 'Aman Sharma',
    phone: '+91 98765 43210',
    house_building: 'Flat 402, Pine Wood Apartments',
    street_locality: 'Rajpur Road',
    city: 'Dehradun',
    state: 'Uttarakhand',
    postal_code: '248001',
    landmark: 'Opposite Silver City Mall',
    is_default: true,
  },
  {
    id: 'addr-seed-2',
    label: 'Work',
    name: 'Aman Sharma',
    phone: '+91 98765 43210',
    house_building: 'Suite 2B, IT Park Sahastradhara',
    street_locality: 'Sahastradhara Road',
    city: 'Dehradun',
    state: 'Uttarakhand',
    postal_code: '248013',
    landmark: 'Near Doon IT Towers',
    is_default: false,
  },
];

export const AddressManagementModal: React.FC<AddressManagementModalProps> = ({
  isOpen,
  onClose,
  onAddressSelected,
  showToast,
}) => {
  const [addresses, setAddresses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form view state: 'list' | 'add' | 'edit'
  const [viewMode, setViewMode] = useState<'list' | 'add' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [label, setLabel] = useState('Home');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [houseBuilding, setHouseBuilding] = useState('');
  const [streetLocality, setStreetLocality] = useState('');
  const [city, setCity] = useState('Dehradun');
  const [state, setState] = useState('Uttarakhand');
  const [postalCode, setPostalCode] = useState('248001');
  const [landmark, setLandmark] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const loadAddresses = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await ApiClient.getCustomerAddresses();
      if (Array.isArray(data) && data.length > 0) {
        setAddresses(data);
        localStorage.setItem('halder_saved_addresses', JSON.stringify(data));
        setIsLoading(false);
        return;
      }
    } catch {
      // API call failed / unauthenticated, fall back to offline/demo storage
    }

    try {
      const cached = localStorage.getItem('halder_saved_addresses');
      if (cached) {
        setAddresses(JSON.parse(cached));
      } else {
        setAddresses(DEFAULT_SEED_ADDRESSES);
        localStorage.setItem('halder_saved_addresses', JSON.stringify(DEFAULT_SEED_ADDRESSES));
      }
    } catch {
      setAddresses(DEFAULT_SEED_ADDRESSES);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAddresses();
      setViewMode('list');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const resetForm = () => {
    setLabel('Home');
    setName('');
    setPhone('');
    setHouseBuilding('');
    setStreetLocality('');
    setCity('Dehradun');
    setState('Uttarakhand');
    setPostalCode('248001');
    setLandmark('');
    setIsDefault(false);
    setEditingId(null);
    setError(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    if (addresses.length === 0) {
      setIsDefault(true);
    }
    setViewMode('add');
  };

  const handleOpenEdit = (addr: any) => {
    setEditingId(addr.id);
    setLabel(addr.label || 'Home');
    setName(addr.name || '');
    setPhone(addr.phone || '');
    setHouseBuilding(addr.house_building || addr.houseBuilding || '');
    setStreetLocality(addr.street_locality || addr.streetLocality || '');
    setCity(addr.city || 'Dehradun');
    setState(addr.state || 'Uttarakhand');
    setPostalCode(addr.postal_code || addr.postalCode || '248001');
    setLandmark(addr.landmark || '');
    setIsDefault(Boolean(addr.is_default));
    setError(null);
    setViewMode('edit');
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !houseBuilding.trim() || !streetLocality.trim() || !postalCode.trim()) {
      setError('Please fill out all required address fields.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = {
      label,
      name: name.trim(),
      phone: phone.trim(),
      houseBuilding: houseBuilding.trim(),
      streetLocality: streetLocality.trim(),
      city: city.trim(),
      state: state.trim(),
      postalCode: postalCode.trim(),
      landmark: landmark.trim(),
      isDefault,
    };

    try {
      if (viewMode === 'edit' && editingId) {
        await ApiClient.updateCustomerAddress(editingId, payload).catch(() => null);
        setAddresses((prev) => {
          const updated = prev.map((a) => (a.id === editingId ? { ...a, ...payload, house_building: payload.houseBuilding, street_locality: payload.streetLocality, postal_code: payload.postalCode, is_default: payload.isDefault } : a));
          localStorage.setItem('halder_saved_addresses', JSON.stringify(updated));
          return updated;
        });
        showToast('Address updated successfully', 'success');
      } else {
        const created = await ApiClient.createCustomerAddress(payload).catch(() => null);
        const newAddr = created || {
          id: `addr-${Date.now()}`,
          ...payload,
          house_building: payload.houseBuilding,
          street_locality: payload.streetLocality,
          postal_code: payload.postalCode,
          is_default: payload.isDefault,
        };
        setAddresses((prev) => {
          const updated = payload.isDefault ? [newAddr, ...prev.map((a) => ({ ...a, is_default: false }))] : [newAddr, ...prev];
          localStorage.setItem('halder_saved_addresses', JSON.stringify(updated));
          return updated;
        });
        showToast('New address saved', 'success');
      }
      setViewMode('list');
    } catch (err: any) {
      setError(err.message || 'Failed to save address.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (addrId: string) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    try {
      await ApiClient.deleteCustomerAddress(addrId).catch(() => null);
      setAddresses((prev) => {
        const updated = prev.filter((a) => a.id !== addrId);
        localStorage.setItem('halder_saved_addresses', JSON.stringify(updated));
        return updated;
      });
      showToast('Address deleted', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete address', 'error');
    }
  };

  const handleSetDefault = async (addrId: string) => {
    try {
      await ApiClient.setDefaultCustomerAddress(addrId).catch(() => null);
      setAddresses((prev) => {
        const updated = prev.map((a) => ({ ...a, is_default: a.id === addrId }));
        localStorage.setItem('halder_saved_addresses', JSON.stringify(updated));
        return updated;
      });
      showToast('Default delivery address updated', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to set default address', 'error');
    }
  };

  const renderLabelIcon = (lbl: string) => {
    switch (lbl?.toLowerCase()) {
      case 'work':
        return <Briefcase className="w-3.5 h-3.5 text-blue-600" />;
      case 'other':
        return <Tag className="w-3.5 h-3.5 text-purple-600" />;
      default:
        return <Home className="w-3.5 h-3.5 text-emerald-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-[#1B201D] w-full max-w-lg rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-white">
                {viewMode === 'list'
                  ? 'Saved Delivery Addresses'
                  : viewMode === 'add'
                  ? 'Add New Address'
                  : 'Edit Address'}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                100% Kisan Direct Delivery location points
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

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl flex items-center gap-2 text-xs text-red-700 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {viewMode === 'list' ? (
            <>
              {/* Add New Address Button */}
              <button
                onClick={handleOpenAdd}
                className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-emerald-600/40 hover:border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add New Address (नया पता जोड़ें)</span>
              </button>

              {/* Addresses List */}
              {isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-400">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  <span className="text-xs">Loading addresses...</span>
                </div>
              ) : addresses.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <div className="text-3xl">🏡</div>
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-white">No addresses saved yet</h4>
                  <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                    Add your home or workplace address for fast checkout and direct delivery from local farmers.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((addr) => {
                    const isDefaultAddr = Boolean(addr.is_default);
                    return (
                      <div
                        key={addr.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isDefaultAddr
                            ? 'border-emerald-600/80 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-xs'
                            : 'border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#1E2320]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                              {renderLabelIcon(addr.label)}
                            </span>
                            <span className="text-xs font-bold text-zinc-900 dark:text-white capitalize">
                              {addr.label || 'Home'}
                            </span>
                            {isDefaultAddr && (
                              <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Default
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(addr)}
                              className="p-1.5 text-zinc-400 hover:text-emerald-600 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                              title="Edit Address"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(addr.id)}
                              className="p-1.5 text-zinc-400 hover:text-red-600 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                              title="Delete Address"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-300 space-y-0.5">
                          <p className="font-bold text-zinc-900 dark:text-white">
                            {addr.name} • <span className="font-normal text-zinc-500">{addr.phone}</span>
                          </p>
                          <p>
                            {addr.house_building}, {addr.street_locality}
                          </p>
                          <p>
                            {addr.city}, {addr.state} - <span className="font-mono font-bold">{addr.postal_code}</span>
                          </p>
                          {addr.landmark && (
                            <p className="text-[11px] text-zinc-400 italic">Landmark: {addr.landmark}</p>
                          )}
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                          {!isDefaultAddr ? (
                            <button
                              onClick={() => handleSetDefault(addr.id)}
                              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                            >
                              Make Default
                            </button>
                          ) : (
                            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                              ✓ Primary Delivery Address
                            </span>
                          )}

                          {onAddressSelected && (
                            <button
                              onClick={() => {
                                onAddressSelected(addr);
                                onClose();
                              }}
                              className="px-3.5 py-1.5 min-h-[38px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                            >
                              Deliver Here
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* Add / Edit Form */
            <form onSubmit={handleSaveAddress} className="space-y-3.5">
              {/* Address Label Selector */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Address Type (लेबल)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Home', 'Work', 'Other'].map((lbl) => (
                    <button
                      type="button"
                      key={lbl}
                      onClick={() => setLabel(lbl)}
                      className={`min-h-[42px] py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        label === lbl
                          ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                          : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {renderLabelIcon(lbl)}
                      <span>{lbl}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipient Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500"
                    placeholder="Recipient name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              {/* House / Flat / Building */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Flat, House no., Building, Apartment *
                </label>
                <input
                  type="text"
                  required
                  value={houseBuilding}
                  onChange={(e) => setHouseBuilding(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. Flat 402, Pine Heights"
                />
              </div>

              {/* Street / Locality */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Area, Street, Sector, Village *
                </label>
                <input
                  type="text"
                  required
                  value={streetLocality}
                  onChange={(e) => setStreetLocality(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. Rajpur Road"
                />
              </div>

              {/* City, State, PIN */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500"
                    placeholder="Dehradun"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500"
                    placeholder="Uttarakhand"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    PIN Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500"
                    placeholder="248001"
                  />
                </div>
              </div>

              {/* Landmark */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Landmark (Optional)
                </label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. Near Clock Tower"
                />
              </div>

              {/* Set as Default Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer pt-1 min-h-[40px]">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Make this my default delivery address
                </span>
              </label>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  disabled={isSubmitting}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Address</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
