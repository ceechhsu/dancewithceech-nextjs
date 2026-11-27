"use client";

import { useSyncExternalStore } from "react";
import {
  addCartItem,
  parseStoredCart,
  removeCartItem,
  setCartQuantity,
  type CartLine,
} from "./cart";

const STORAGE_KEY = "dancewithceech-shop-cart-v1";
const listeners = new Set<() => void>();

type CartSnapshot = {
  lines: readonly CartLine[];
  ready: boolean;
};

const serverSnapshot: CartSnapshot = { lines: [], ready: false };
let snapshot = serverSnapshot;
let storedValue: string | null | undefined;

function getSnapshot(): CartSnapshot {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw !== storedValue) {
      snapshot = { lines: parseStoredCart(raw), ready: true };
      storedValue = raw;
    }
  } catch {
    if (!snapshot.ready) snapshot = { lines: [], ready: true };
  }

  return snapshot;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) listener();
  };
  window.addEventListener("storage", handleStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function saveLines(lines: readonly CartLine[]) {
  snapshot = { lines, ready: true };
  try {
    const raw = JSON.stringify(lines);
    window.localStorage.setItem(STORAGE_KEY, raw);
    storedValue = raw;
  } catch {
    // Keep the cart usable for the current session when storage is blocked.
  }
  listeners.forEach((listener) => listener());
}

function addItem(line: CartLine) {
  const { lines, added, quantity } = addCartItem(getSnapshot().lines, line);
  if (added > 0) saveLines(lines);
  return { added, quantity };
}

function updateQuantity(id: string, quantity: number) {
  const lines = getSnapshot().lines;
  const updated = setCartQuantity(lines, id, quantity);
  if (updated !== lines) saveLines(updated);
}

function removeItem(id: string) {
  const lines = getSnapshot().lines;
  const updated = removeCartItem(lines, id);
  if (updated !== lines) saveLines(updated);
}

export function useShopCart() {
  const cart = useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
  return { ...cart, addItem, updateQuantity, removeItem };
}
