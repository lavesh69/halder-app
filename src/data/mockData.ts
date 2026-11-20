import { User, Farmer, Product, Order, Category, Review, AppNotification } from '../types';

export const initialUsers: User[] = [
  {
    id: 'user-admin-1',
    halder_id: 'HAL-ADM-90000001',
    username: 'admin',
    name: 'Vikram Patel',
    phone: '+91 99000 11223',
    email: 'admin@halder.com',
    role: 'admin',
    profile_image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    status: 'active',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
];

export const initialCategories: Category[] = [
  { id: 'cat-veg', name: 'Vegetables', emoji: '🥬', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&auto=format&fit=crop&q=80', active: true },
  { id: 'cat-fruits', name: 'Fruits', emoji: '🍎', image: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&auto=format&fit=crop&q=80', active: true },
  { id: 'cat-greens', name: 'Leafy Greens', emoji: '🌿', image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&auto=format&fit=crop&q=80', active: true },
  { id: 'cat-grains', name: 'Grains', emoji: '🌾', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=80', active: true },
  { id: 'cat-dairy', name: 'Dairy', emoji: '🥛', image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=80', active: true },
  { id: 'cat-org', name: 'Organic', emoji: '🌱', image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&auto=format&fit=crop&q=80', active: true },
  { id: 'cat-home', name: 'Homemade', emoji: '🍯', image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&auto=format&fit=crop&q=80', active: true },
  { id: 'cat-seeds', name: 'Seeds', emoji: '🌾', image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=400&auto=format&fit=crop&q=80', active: true },
  { id: 'cat-other', name: 'Other', emoji: '🧺', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80', active: true },
];

export const initialFarmers: Farmer[] = [];
export const initialProducts: Product[] = [];
export const initialOrders: Order[] = [];
export const initialReviews: Review[] = [];
export const initialNotifications: AppNotification[] = [];
