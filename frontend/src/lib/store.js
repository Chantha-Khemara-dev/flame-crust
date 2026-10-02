import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useStore = create(
  persist(
    (set, get) => ({
      cart: {
        items: [],
        total: 0,
        coupon: null,
      },
      addToCart: (product, quantity = 1, options = {}) => {
        set((state) => {
          const existingItemIndex = state.cart.items.findIndex(
            (item) => item.product.id === product.id && JSON.stringify(item.options) === JSON.stringify(options)
          );

          let newItems = [...state.cart.items];
          if (existingItemIndex >= 0) {
            newItems[existingItemIndex].quantity += quantity;
          } else {
            newItems.push({ product, quantity, options });
          }

          const newTotal = newItems.reduce((sum, item) => {
            const itemPrice = item.product.price || 0; // Adjust based on actual API payload
            return sum + itemPrice * item.quantity;
          }, 0);

          return {
            cart: {
              ...state.cart,
              items: newItems,
              total: newTotal,
            },
          };
        });
      },
      removeFromCart: (productId, options = {}) => {
        set((state) => {
          const newItems = state.cart.items.filter(
            (item) => !(item.product.id === productId && JSON.stringify(item.options) === JSON.stringify(options))
          );
          
          const newTotal = newItems.reduce((sum, item) => {
             const itemPrice = item.product.price || 0;
             return sum + itemPrice * item.quantity;
          }, 0);

          return {
            cart: {
              ...state.cart,
              items: newItems,
              total: newTotal,
            },
          };
        });
      },
      updateQuantity: (productId, quantity, options = {}) => {
        if (quantity <= 0) {
          get().removeFromCart(productId, options);
          return;
        }
        set((state) => {
          const newItems = state.cart.items.map((item) => {
            if (item.product.id === productId && JSON.stringify(item.options) === JSON.stringify(options)) {
              return { ...item, quantity };
            }
            return item;
          });
          
          const newTotal = newItems.reduce((sum, item) => {
             const itemPrice = item.product.price || 0;
             return sum + itemPrice * item.quantity;
          }, 0);

          return {
            cart: {
              ...state.cart,
              items: newItems,
              total: newTotal,
            },
          };
        });
      },
      applyCoupon: (coupon) => {
        set((state) => ({
          cart: {
            ...state.cart,
            coupon,
          },
        }));
      },
      clearCart: () => {
        set({
          cart: {
            items: [],
            total: 0,
            coupon: null,
          },
        });
      },
    }),
    {
      name: 'flame-crust-cart',
    }
  )
);
