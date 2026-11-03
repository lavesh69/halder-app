import React from 'react';
import { useApp } from '../../context/AppContext';
import { ProductCategory } from '../../types';
import { X, ChevronRight, Layers, Sparkles } from 'lucide-react';

interface CategoryCardInfo {
  name: string;
  cat: ProductCategory;
  emoji: string;
  image: string;
  desc: string;
  popularSubcategories: string[];
}

const detailedCategories: CategoryCardInfo[] = [
  {
    name: 'Farm Equipment & Machinery',
    cat: 'Farm Equipment',
    emoji: '🚜',
    image: 'https://images.unsplash.com/photo-1594771804886-a933bb2d609b?w=400',
    desc: 'Tractors, power weeders, harvesters, sprayers & water pumps',
    popularSubcategories: ['Tractors', 'Power Weeders', 'Sprayers', 'Solar Pumps'],
  },
  {
    name: 'Livestock & Cattle (पशुधन)',
    cat: 'Livestock',
    emoji: '🐄',
    image: 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?w=400',
    desc: 'Desi Gir, Sahiwal cows, Murrah buffaloes, goats & poultry',
    popularSubcategories: ['Milch Cows', 'Murrah Buffaloes', 'Dairy Breeds', 'Goats'],
  },
  {
    name: 'Fresh Vegetables (ताज़ी सब्जियां)',
    cat: 'Vegetables',
    emoji: '🥬',
    image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400',
    desc: 'Morning-harvested tomatoes, pahadi potatoes, onions & greens',
    popularSubcategories: ['Pahadi Potatoes', 'Vine Tomatoes', 'Leafy Spinach', 'Onions'],
  },
  {
    name: 'Grains & Pulses (अनाज और दालें)',
    cat: 'Grains',
    emoji: '🌾',
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400',
    desc: 'Basmati paddy, Sharbati wheat, mustard seeds & organic lentils',
    popularSubcategories: ['Basmati Rice', 'Sharbati Wheat', 'Yellow Mustard', 'Toor Dal'],
  },
  {
    name: 'Seasonal Fruits & Orchards',
    cat: 'Fruits',
    emoji: '🍎',
    image: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400',
    desc: 'Mountain apples, sweet mangoes, bananas & citrus fruits',
    popularSubcategories: ['Mountain Apples', 'Langra Mangoes', 'Citrus Oranges', 'Papaya'],
  },
  {
    name: 'Dairy & Fresh Milk (दुग्ध उत्पाद)',
    cat: 'Dairy',
    emoji: '🥛',
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400',
    desc: 'Pure A2 Desi cow milk, curd, paneer, and bilona ghee',
    popularSubcategories: ['Desi Cow A2 Milk', 'Bilona Ghee', 'Fresh Paneer', 'Cultured Curd'],
  },
  {
    name: '100% Certified Organic',
    cat: 'Organic',
    emoji: '🌱',
    image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400',
    desc: 'Pesticide-free certified naturally grown vegetables & grains',
    popularSubcategories: ['Zero Pesticide', 'Natural Compost', 'Himalayan Herbs'],
  },
  {
    name: 'Certified Seeds & Saplings',
    cat: 'Seeds',
    emoji: '🌱',
    image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=400',
    desc: 'High-yield hybrid seeds, vegetable seedlings & fruit saplings',
    popularSubcategories: ['Hybrid Seeds', 'Nursery Saplings', 'Green Manure'],
  },
  {
    name: 'Homemade & Farm Processed',
    cat: 'Homemade',
    emoji: '🍯',
    image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400',
    desc: 'Raw mountain honey, cold-pressed mustard oil, pickles & jams',
    popularSubcategories: ['Raw Forest Honey', 'Kachi Ghani Oil', 'Handmade Pickles'],
  },
];

interface ExploreCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExploreCategoriesModal: React.FC<ExploreCategoriesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { setSelectedCategory, products } = useApp();

  if (!isOpen) return null;

  const handleSelect = (cat: ProductCategory) => {
    setSelectedCategory(cat);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-fade-in">
      <div
        className="w-full max-w-lg bg-white dark:bg-[#1B201D] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 max-h-[90vh] flex flex-col overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600" />
            <h3 className="font-black text-lg text-zinc-900 dark:text-white">
              All Categories (सभी श्रेणियां)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Categories List */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          <button
            onClick={() => handleSelect('All')}
            className="w-full p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-between transition text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌱</span>
              <div>
                <h4 className="font-black text-sm text-zinc-900 dark:text-white">
                  All Marketplace Listings
                </h4>
                <p className="text-[11px] text-zinc-500">
                  Browse all {products.length} live advertisements
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          </button>

          {detailedCategories.map((item) => {
            const count = products.filter((p) => p.category === item.cat).length;
            return (
              <div
                key={item.cat}
                onClick={() => handleSelect(item.cat)}
                className="p-3.5 rounded-2xl bg-white dark:bg-[#222824] hover:bg-zinc-50 dark:hover:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 hover:border-emerald-500 cursor-pointer transition shadow-2xs group flex items-start gap-3.5"
              >
                <img
                  src={item.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200'}
                  alt={item.name}
                  className="w-16 h-16 rounded-xl object-cover shrink-0 bg-zinc-100 dark:bg-zinc-800 group-hover:scale-105 transition-transform"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-sm text-zinc-900 dark:text-white truncate flex items-center gap-1.5">
                      <span>{item.emoji}</span>
                      <span>{item.name}</span>
                    </h4>
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full shrink-0">
                      {count} Ads
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-1">
                    {item.desc}
                  </p>

                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.popularSubcategories.map((sub, i) => (
                      <span
                        key={i}
                        className="text-[9px] font-semibold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-700/60 px-1.5 py-0.5 rounded-md"
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-emerald-600 shrink-0 self-center" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
