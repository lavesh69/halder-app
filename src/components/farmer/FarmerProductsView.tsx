import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';
import { Product, ProductCategory } from '../../types';
import {
  Plus,
  Trash2,
  Edit,
  Sparkles,
  Search,
  Zap,
  Flame,
  Eye,
  Check,
  X,
  AlertTriangle,
  Camera,
  Layers,
  ArrowUpDown,
  Share2,
  FileText,
  CheckSquare,
  Square,
  Printer,
  Copy,
  Phone,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

const CATEGORY_OPTIONS: ProductCategory[] = [
  'Vegetables',
  'Fruits',
  'Leafy Greens',
  'Grains',
  'Dairy',
  'Organic',
  'Homemade',
  'Seeds',
  'Farm Equipment',
  'Livestock',
  'Other',
];

const UNIT_OPTIONS = ['kg', 'gram', 'bunch', 'piece', 'litre', 'packet', 'box', 'L'];

const PRESET_IMAGES = [
  { name: 'Red Tomatoes', url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80' },
  { name: 'Fresh Spinach', url: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&auto=format&fit=crop&q=80' },
  { name: 'Farm Potatoes', url: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=80' },
  { name: 'Green Peas', url: 'https://images.unsplash.com/photo-1587735243615-c03f25aaff15?w=600&auto=format&fit=crop&q=80' },
  { name: 'Desi Carrots', url: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600&auto=format&fit=crop&q=80' },
  { name: 'A2 Cow Milk', url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80' },
  { name: 'Pure Honey', url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&auto=format&fit=crop&q=80' },
  { name: 'Basmati Rice', url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80' },
];

export const FarmerProductsView: React.FC = () => {
  const {
    products,
    setIsAddProductOpen,
    toggleProductAvailability,
    toggleProductFeatured,
    toggleProductUrgent,
    updateProduct,
    updateProductPrice,
    bulkUpdateProducts,
    bulkDeleteProducts,
    deleteProduct,
    setSelectedProduct,
    showToast,
    currentUser,
    activeCity,
  } = useApp();

  const activeFarmerId = currentUser?.farmerProfileId || currentUser?.id || 'farmer-1';
  const farmerName = currentUser?.name || 'Rajesh Kumar';
  const farmerPhone = currentUser?.phone || '+91 98450 12345';

  // Filter products belonging to active farmer (fallback to farmer-1 for default demo seeds)
  const myProducts = products.filter(
    (p) => p.farmerId === activeFarmerId || p.farmerId === 'farmer-1'
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'paused' | 'featured' | 'urgent' | 'low_stock'>('all');

  // Batch Selection & Rate Card State
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isRateCardOpen, setIsRateCardOpen] = useState(false);

  // Edit Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<ProductCategory>('Vegetables');
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editUnit, setEditUnit] = useState('kg');
  const [editStock, setEditStock] = useState<number>(0);
  const [editDescription, setEditDescription] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editIsOrganic, setEditIsOrganic] = useState(false);
  const [editIsNegotiable, setEditIsNegotiable] = useState(false);
  const [editFreshness, setEditFreshness] = useState('Morning Harvest');

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setEditName(p.name);
    setEditCategory((p.category as ProductCategory) || 'Vegetables');
    setEditPrice(p.price);
    setEditUnit(p.unit || 'kg');
    setEditStock(p.availableQuantity || 0);
    setEditDescription(p.description || '');
    setEditImage(p.image || PRESET_IMAGES[0].url);
    setEditIsOrganic(!!p.isOrganic);
    setEditIsNegotiable(p.isNegotiable ?? true);
    setEditFreshness(p.freshnessTag || 'Morning Harvest');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!editName.trim() || editPrice <= 0 || editStock < 0) {
      showToast('Please provide valid name, price, and stock', 'error');
      return;
    }

    updateProduct(editingProduct.id, {
      name: editName.trim(),
      category: editCategory,
      price: Number(editPrice),
      unit: editUnit,
      availableQuantity: Number(editStock),
      description: editDescription.trim(),
      image: editImage,
      isOrganic: editIsOrganic,
      isNegotiable: editIsNegotiable,
      freshnessTag: editFreshness,
    });

    setEditingProduct(null);
  };

  const handleQuickStockChange = (productId: string, currentStock: number, delta: number) => {
    const newStock = Math.max(0, currentStock + delta);
    updateProduct(productId, { availableQuantity: newStock });
    showToast(`Stock updated to ${newStock}`, 'info');
  };

  const handleQuickPriceChange = (productId: string, currentPrice: number, delta: number) => {
    const newPrice = Math.max(5, currentPrice + delta);
    updateProductPrice(productId, newPrice);
  };

  const toggleSelectProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedProductIds.length === filteredProducts.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filteredProducts.map((p) => p.id));
    }
  };

  const handleBatchAvailability = (isAvailable: boolean) => {
    if (selectedProductIds.length === 0) return;
    bulkUpdateProducts(selectedProductIds, { isAvailable });
    setSelectedProductIds([]);
  };

  const handleBatchPriceNudge = (delta: number) => {
    if (selectedProductIds.length === 0) return;
    selectedProductIds.forEach((id) => {
      const prod = myProducts.find((p) => p.id === id);
      if (prod) {
        const newPrice = Math.max(5, prod.price + delta);
        updateProductPrice(id, newPrice);
      }
    });
    showToast(`Price adjusted by ${delta > 0 ? `+₹${delta}` : `-₹${Math.abs(delta)}`} for ${selectedProductIds.length} crops!`, 'success');
  };

  const handleBatchDelete = () => {
    if (selectedProductIds.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedProductIds.length} listings from Mandi?`)) {
      bulkDeleteProducts(selectedProductIds);
      setSelectedProductIds([]);
    }
  };

  // Filter listings
  const filteredProducts = myProducts.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeFilter === 'active') return p.isAvailable;
    if (activeFilter === 'paused') return !p.isAvailable;
    if (activeFilter === 'featured') return p.isFeatured;
    if (activeFilter === 'urgent') return p.isUrgent;
    if (activeFilter === 'low_stock') return p.availableQuantity < 10;
    return true;
  });

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-zinc-900 dark:text-white">
            My Harvest & Produce Ads
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {myProducts.length} crop listings • {myProducts.filter((p) => p.isAvailable).length} active in Mandi
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsRateCardOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-2xl text-xs font-bold transition shadow-2xs"
            title="Generate & Share Mandi Rate Card"
          >
            <FileText className="w-4 h-4" />
            <span>📋 Mandi Rate Card (रेट कार्ड)</span>
          </button>

          <button
            onClick={() => setIsAddProductOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-2xl shadow-soft transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ List New Crop / Ad</span>
          </button>
        </div>
      </div>

      {/* Batch Actions Toolbar (Shown when items are selected) */}
      {selectedProductIds.length > 0 && (
        <div className="p-3.5 bg-emerald-900 text-white rounded-2xl shadow-lg border border-emerald-700 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-700 text-white text-xs font-black flex items-center justify-center">
              {selectedProductIds.length}
            </span>
            <span className="text-xs font-bold">
              {selectedProductIds.length} harvest listings selected
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleBatchAvailability(true)}
              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 rounded-xl text-xs font-bold transition"
            >
              🟢 Mark Live
            </button>
            <button
              onClick={() => handleBatchAvailability(false)}
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-bold transition"
            >
              ⏸️ Pause
            </button>
            <button
              onClick={() => handleBatchPriceNudge(5)}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold transition"
              title="Add ₹5 to selected items"
            >
              +₹5 Price
            </button>
            <button
              onClick={() => handleBatchPriceNudge(-5)}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold transition"
              title="Reduce ₹5 on selected items"
            >
              -₹5 Price
            </button>
            <button
              onClick={handleBatchDelete}
              className="px-2.5 py-1 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-bold transition flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
            <button
              onClick={() => setSelectedProductIds([])}
              className="px-2 py-1 text-xs text-emerald-200 hover:underline"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search crop name, category, or variety..."
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#1B201D] border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            />
          </div>

          <button
            onClick={toggleSelectAll}
            className={`p-2.5 rounded-2xl border text-xs font-bold flex items-center gap-1.5 transition ${
              selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-white dark:bg-[#1B201D] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50'
            }`}
            title="Select all filtered crops"
          >
            {selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0 ? (
              <CheckSquare className="w-4 h-4" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Select All</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeFilter === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-[#1B201D] text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800'
            }`}
          >
            All Crops ({myProducts.length})
          </button>

          <button
            onClick={() => setActiveFilter('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeFilter === 'active'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-[#1B201D] text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800'
            }`}
          >
            🟢 Active ({myProducts.filter((p) => p.isAvailable).length})
          </button>

          <button
            onClick={() => setActiveFilter('paused')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeFilter === 'paused'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-[#1B201D] text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800'
            }`}
          >
            ⏸️ Paused ({myProducts.filter((p) => !p.isAvailable).length})
          </button>

          <button
            onClick={() => setActiveFilter('featured')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeFilter === 'featured'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-[#1B201D] text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800'
            }`}
          >
            ⚡ Boosted ({myProducts.filter((p) => p.isFeatured).length})
          </button>

          <button
            onClick={() => setActiveFilter('urgent')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeFilter === 'urgent'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-[#1B201D] text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800'
            }`}
          >
            🔥 Urgent Sale ({myProducts.filter((p) => p.isUrgent).length})
          </button>

          <button
            onClick={() => setActiveFilter('low_stock')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeFilter === 'low_stock'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white dark:bg-[#1B201D] text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800'
            }`}
          >
            ⚠️ Low Stock ({myProducts.filter((p) => p.availableQuantity < 10).length})
          </button>
        </div>
      </div>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="p-5 sm:p-8 text-center bg-white dark:bg-[#1B201D] rounded-3xl border border-zinc-200 dark:border-zinc-800 space-y-3">
          <Layers className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto" />
          <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">No crop listings found</h4>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Try adjusting your search keywords or list a new harvest to start selling in the Mandi.
          </p>
          <button
            onClick={() => setIsAddProductOpen(true)}
            className="min-h-[44px] px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center justify-center"
          >
            + Add Produce Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => {
            const isLowStock = product.availableQuantity < 10;
            return (
              <div
                key={product.id}
                className={`p-4 bg-white dark:bg-[#1B201D] rounded-2xl border transition-all flex flex-col justify-between ${
                  product.isAvailable
                    ? 'border-zinc-200/80 dark:border-zinc-800/80 shadow-soft hover:shadow-soft-md'
                    : 'border-zinc-200/40 dark:border-zinc-800/40 opacity-75 bg-zinc-50 dark:bg-zinc-900/60'
                }`}
              >
                {/* Upper Section */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    {/* Image with Badges */}
                    <div className="relative shrink-0">
                      <img
                        src={product.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200'}
                        alt={product.name}
                        className="w-20 h-20 rounded-2xl object-cover bg-zinc-100 dark:bg-zinc-800 shadow-xs"
                      />
                      {/* Multi-select Checkbox */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectProduct(product.id);
                        }}
                        className={`absolute top-1 right-1 p-1 rounded-lg backdrop-blur-xs transition ${
                          selectedProductIds.includes(product.id)
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-black/40 text-white/90 hover:bg-black/60'
                        }`}
                        title={selectedProductIds.includes(product.id) ? 'Deselect crop' : 'Select crop'}
                      >
                        {selectedProductIds.includes(product.id) ? (
                          <CheckSquare className="w-3.5 h-3.5" />
                        ) : (
                          <Square className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {product.isFeatured && (
                        <span className="absolute -top-1.5 -left-1.5 bg-purple-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-xs flex items-center gap-0.5">
                          <Zap className="w-2.5 h-2.5 fill-current" />
                          BOOST
                        </span>
                      )}
                      {product.isUrgent && (
                        <span className="absolute -bottom-1 -left-1 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-xs flex items-center gap-0.5">
                          <Flame className="w-2.5 h-2.5 fill-current" />
                          URGENT
                        </span>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                          {product.category}
                        </span>
                        {product.isOrganic && (
                          <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
                            Organic
                          </span>
                        )}
                      </div>

                      <h4 className="font-black text-sm text-zinc-900 dark:text-white truncate mt-1">
                        {product.name}
                      </h4>

                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-baseline gap-1">
                          <span className="text-base font-black text-emerald-700 dark:text-emerald-400">
                            {formatCurrency(product.price)}
                          </span>
                          <span className="text-xs text-zinc-400">/ {product.unit}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleQuickPriceChange(product.id, product.price, -5)}
                            className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded text-[10px] font-bold hover:bg-zinc-200 transition"
                            title="Quickly reduce ₹5"
                          >
                            -₹5
                          </button>
                          <button
                            onClick={() => handleQuickPriceChange(product.id, product.price, 5)}
                            className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded text-[10px] font-bold hover:bg-emerald-100 transition"
                            title="Quickly add ₹5"
                          >
                            +₹5
                          </button>
                        </div>
                      </div>

                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                        {product.description || 'Direct farm harvest'}
                      </p>
                    </div>
                  </div>

                  {/* Stock Adjuster Row */}
                  <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase font-bold block">
                        Available Stock
                      </span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <strong className="text-xs text-zinc-900 dark:text-white">
                          {product.availableQuantity} {product.unit}
                        </strong>
                        {isLowStock && (
                          <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-1 py-0.5 rounded">
                            Low
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleQuickStockChange(product.id, product.availableQuantity, -5)}
                        className="px-1.5 py-0.5 bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-600 rounded-lg text-[10px] font-bold hover:bg-zinc-100 transition"
                        title="Reduce 5"
                      >
                        -5
                      </button>
                      <button
                        onClick={() => handleQuickStockChange(product.id, product.availableQuantity, 5)}
                        className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-lg text-[10px] font-bold hover:bg-emerald-100 transition"
                        title="Add 5"
                      >
                        +5
                      </button>
                      <button
                        onClick={() => handleQuickStockChange(product.id, product.availableQuantity, 10)}
                        className="px-2 py-0.5 bg-emerald-600 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-700 transition"
                        title="Add 10"
                      >
                        +10
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions Row */}
                <div className="pt-3 mt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-1 flex-wrap">
                  {/* Availability Toggle */}
                  <button
                    onClick={() => toggleProductAvailability(product.id)}
                    className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full transition-colors ${
                      product.isAvailable
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${product.isAvailable ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                    <span>{product.isAvailable ? 'Live' : 'Paused'}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {/* Boost Toggle */}
                    <button
                      onClick={() => toggleProductFeatured(product.id)}
                      className={`p-1.5 rounded-lg text-xs transition ${
                        product.isFeatured
                          ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                          : 'text-zinc-400 hover:text-purple-600 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                      title="Boost Ad to Top"
                    >
                      <Zap className="w-3.5 h-3.5" />
                    </button>

                    {/* Urgent Toggle */}
                    <button
                      onClick={() => toggleProductUrgent(product.id)}
                      className={`p-1.5 rounded-lg text-xs transition ${
                        product.isUrgent
                          ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                          : 'text-zinc-400 hover:text-red-600 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                      title="Mark as Urgent Clearance"
                    >
                      <Flame className="w-3.5 h-3.5" />
                    </button>

                    {/* Preview As Buyer */}
                    <button
                      onClick={() => setSelectedProduct(product)}
                      className="p-1.5 text-zinc-400 hover:text-emerald-600 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                      title="Preview Buyer View"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => openEditModal(product)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                      title="Edit Produce Details"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
                          deleteProduct(product.id);
                        }
                      }}
                      className="p-1.5 text-zinc-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                      title="Delete Product"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setIsAddProductOpen(true)}
        className="fixed bottom-20 right-6 z-30 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-soft-lg flex items-center gap-2 active:scale-95 transition-all font-bold text-xs"
      >
        <Plus className="w-5 h-5 stroke-[2.5]" />
        <span>+ Add Harvest</span>
      </button>

      {/* ========================================================================= */}
      {/* EDIT PRODUCT MODAL */}
      {/* ========================================================================= */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#1B201D] w-full max-w-lg rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                  <Edit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-zinc-900 dark:text-white">
                    Edit Crop Listing (फसल जानकारी बदलें)
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Update Mandi pricing, available harvest quantity, and freshness
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Name */}
              <div>
                <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Produce / Crop Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Desi Sharbati Wheat, Fresh Spinach"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Category & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Category (श्रेणी)
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as ProductCategory)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Unit (इकाई)
                  </label>
                  <select
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Price & Available Stock */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Price (₹ प्रति {editUnit})
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Available Stock ({editUnit})
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editStock}
                    onChange={(e) => setEditStock(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Photo Preset Selector */}
              <div>
                <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Produce Photo
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {PRESET_IMAGES.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setEditImage(img.url)}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition ${
                        editImage === img.url
                          ? 'border-emerald-600 ring-2 ring-emerald-500/30'
                          : 'border-zinc-200 dark:border-zinc-700 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                      {editImage === img.url && (
                        <div className="absolute inset-0 bg-emerald-600/30 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white stroke-[3]" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <input
                  type="url"
                  value={editImage}
                  onChange={(e) => setEditImage(e.target.value)}
                  placeholder="Or paste custom image URL..."
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono text-[11px] focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Toggles: Organic & Negotiable */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editIsOrganic}
                    onChange={(e) => setEditIsOrganic(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    🌱 Organic Certified
                  </span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editIsNegotiable}
                    onChange={(e) => setEditIsNegotiable(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    🤝 Price Negotiable
                  </span>
                </label>
              </div>

              {/* Freshness Tag */}
              <div>
                <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Freshness Badge
                </label>
                <input
                  type="text"
                  value={editFreshness}
                  onChange={(e) => setEditFreshness(e.target.value)}
                  placeholder="e.g. Morning Harvest, Picked Today, Cold Storage"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Harvest Description / Notes for Buyers
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Provide quality details, pesticide-free proof, bulk order discounts..."
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-xs transition"
                >
                  Save Changes (अपडेट करें)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MANDI DAILY RATE CARD PRINTABLE & SHAREABLE MODAL */}
      {/* ========================================================================= */}
      {isRateCardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white text-zinc-900 w-full max-w-lg rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 bg-emerald-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-300" />
                <div>
                  <h3 className="font-black text-sm">Official Mandi Rate Card (दैनिक भाव पत्र)</h3>
                  <span className="text-[10px] text-emerald-200">HALDER Kisan Direct Marketplace</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => window.print()}
                  className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white transition flex items-center gap-1 text-xs font-bold"
                  title="Print Slip"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Print</span>
                </button>
                <button
                  onClick={() => setIsRateCardOpen(false)}
                  className="p-1.5 text-emerald-200 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Rate Card Content */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Farm & Mandi Branding */}
              <div className="border-b border-zinc-200 pb-3 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-base font-black text-emerald-950">Green Valley Organic Farm</h2>
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-zinc-500 text-[11px] mt-0.5">
                    Farmer: <strong>{farmerName}</strong> • {activeCity} Mandi
                  </p>
                  <p className="text-zinc-500 text-[11px]">
                    Direct Helpline: <strong>{farmerPhone}</strong>
                  </p>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                    Mandi Valid Today
                  </span>
                  <span className="text-[10px] text-zinc-400 block mt-1">
                    {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Price Table */}
              <div className="space-y-2">
                <h4 className="font-bold text-[11px] uppercase tracking-wider text-zinc-500">
                  Current Harvest Rates & Availability
                </h4>
                <div className="border border-zinc-200 rounded-2xl overflow-hidden divide-y divide-zinc-100">
                  <div className="grid grid-cols-12 bg-zinc-50 p-2 font-bold text-[11px] text-zinc-600">
                    <div className="col-span-6">Produce Item</div>
                    <div className="col-span-3 text-right">Mandi Rate</div>
                    <div className="col-span-3 text-right">Available Stock</div>
                  </div>

                  {myProducts.map((p) => (
                    <div key={p.id} className="grid grid-cols-12 p-2 items-center text-[11px]">
                      <div className="col-span-6">
                        <strong className="text-zinc-900 block">{p.name}</strong>
                        <span className="text-[10px] text-zinc-500">{p.category} {p.isOrganic ? '• Organic' : ''}</span>
                      </div>
                      <div className="col-span-3 text-right">
                        <span className="font-black text-emerald-700">₹{p.price}</span>
                        <span className="text-zinc-400 text-[10px]">/{p.unit}</span>
                      </div>
                      <div className="col-span-3 text-right font-medium text-zinc-700">
                        {p.isAvailable ? `${p.availableQuantity} ${p.unit}` : <span className="text-red-500 font-bold">Out of stock</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer Note */}
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-[11px] text-zinc-500 space-y-1">
                <p>• Zero middleman commissions. 100% of payment goes directly to Kisan.</p>
                <p>• Bulk order discounts (&gt;20 kg) and daily apartment delivery available.</p>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="p-3 bg-zinc-50 border-t border-zinc-200 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  const cardText = `🌾 *HALDER MANDI RATE CARD*\n🌱 Farm: Green Valley Organic Farm\n👨‍🌾 Farmer: ${farmerName} (${farmerPhone})\n📍 Mandi: ${activeCity}\n📅 Date: ${new Date().toLocaleDateString()}\n--------------------------------\n` +
                    myProducts.map(p => `• ${p.name}: ₹${p.price}/${p.unit} (${p.isAvailable ? `${p.availableQuantity} ${p.unit} in stock` : 'Out of stock'})`).join('\n') +
                    `\n--------------------------------\n🚀 Order direct on HALDER App. Zero commission!`;
                  navigator.clipboard.writeText(cardText);
                  showToast('📋 Rate Card copied to clipboard! Ready to paste into WhatsApp.', 'success');
                }}
                className="px-3.5 py-2 bg-white border border-zinc-300 text-zinc-800 rounded-xl text-xs font-bold hover:bg-zinc-100 transition flex items-center gap-1.5 shadow-2xs"
              >
                <Copy className="w-3.5 h-3.5 text-zinc-500" />
                <span>Copy Text</span>
              </button>

              <button
                onClick={() => {
                  const cardText = `🌾 *HALDER MANDI RATE CARD*\n🌱 Farm: Green Valley Organic Farm\n👨‍🌾 Farmer: ${farmerName} (${farmerPhone})\n📍 Mandi: ${activeCity}\n📅 Date: ${new Date().toLocaleDateString()}\n--------------------------------\n` +
                    myProducts.map(p => `• ${p.name}: ₹${p.price}/${p.unit} (${p.isAvailable ? `${p.availableQuantity} ${p.unit} in stock` : 'Out of stock'})`).join('\n') +
                    `\n--------------------------------\n🚀 Order direct on HALDER App. Zero commission!`;
                  const encoded = encodeURIComponent(cardText);
                  window.open(`https://wa.me/?text=${encoded}`, '_blank');
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share on WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
