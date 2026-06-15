'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface CartItem {
  productId: string;
  productName: string;
  productSku: string;
  unitPrice: number;
  quantity: number;
  designJson?: any;
  previewPngUrl?: string;
  productionSvgUrl?: string;
  inkId?: string;
  inkName?: string;
  categoryIsCustomizable?: boolean;
  isWood?: boolean;
  woodPrice?: number;
  shape?: string;
  widthMm?: number;
  heightMm?: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  updateItem: (index: number, item: CartItem) => void;
  updateQuantity: (index: number, quantity: number) => void;
  updateIsWood: (index: number, isWood: boolean, woodPrice?: number) => void;
  removeItem: (index: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalAmount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // Cargar del localStorage al montar
  useEffect(() => {
    try {
      const stored = localStorage.getItem('cart');
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  // Persistir en localStorage cuando cambia
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addItem = (item: CartItem) => {
    setItems((prev) => [...prev, item]);
  };

  const updateItem = (index: number, item: CartItem) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = item;
      return next;
    });
  };

  const updateQuantity = (index: number, quantity: number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], quantity: Math.max(1, quantity) };
      return next;
    });
  };

  const updateIsWood = (index: number, isWood: boolean, woodPrice?: number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], isWood, woodPrice };
      return next;
    });
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, updateItem, updateQuantity, updateIsWood, removeItem, clearCart, totalItems, totalAmount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}
