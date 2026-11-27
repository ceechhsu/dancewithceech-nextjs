import { getSizes, products } from "./products";

export type CartVariant = {
  productId: string;
  colorId: string;
  size: string;
};

export type CartLine = CartVariant & {
  quantity: number;
};

export const MAX_CART_QUANTITY = 99;

export function cartLineKey({ productId, colorId, size }: CartVariant): string {
  return JSON.stringify([productId, colorId, size]);
}

function isValidQuantity(quantity: unknown): quantity is number {
  return typeof quantity === "number"
    && Number.isInteger(quantity)
    && quantity >= 1
    && quantity <= MAX_CART_QUANTITY;
}

function readCartLine(value: unknown): CartLine | undefined {
  if (typeof value !== "object" || value === null) return;

  const { productId, colorId, size, quantity } = value as Record<string, unknown>;
  if (typeof productId !== "string" || typeof colorId !== "string"
    || typeof size !== "string" || !isValidQuantity(quantity)) return;

  const product = products.find(({ id }) => id === productId);
  if (!product?.colors.some(({ id }) => id === colorId)
    || !getSizes(product, colorId).includes(size)) return;

  return { productId, colorId, size, quantity };
}

export function addCartItem(
  lines: readonly CartLine[],
  value: unknown,
): { lines: readonly CartLine[]; added: number; quantity: number } {
  const line = readCartLine(value);
  if (!line) return { lines, added: 0, quantity: 0 };

  const id = cartLineKey(line);
  const existingIndex = lines.findIndex((entry) => cartLineKey(entry) === id);
  if (existingIndex === -1) {
    return { lines: [...lines, line], added: line.quantity, quantity: line.quantity };
  }

  const existing = lines[existingIndex];
  const added = Math.min(line.quantity, MAX_CART_QUANTITY - existing.quantity);
  if (added <= 0) return { lines, added: 0, quantity: existing.quantity };

  const next = [...lines];
  const quantity = existing.quantity + added;
  next[existingIndex] = { ...existing, quantity };
  return { lines: next, added, quantity };
}

export function setCartQuantity(lines: readonly CartLine[], id: string, quantity: number) {
  if (!isValidQuantity(quantity)) return lines;

  const index = lines.findIndex((line) => cartLineKey(line) === id);
  if (index === -1 || lines[index].quantity === quantity) return lines;

  const next = [...lines];
  next[index] = { ...lines[index], quantity };
  return next;
}

export function removeCartItem(lines: readonly CartLine[], id: string) {
  const next = lines.filter((line) => cartLineKey(line) !== id);
  return next.length === lines.length ? lines : next;
}

export function parseStoredCart(raw: string | null): readonly CartLine[] {
  let value: unknown;
  try {
    value = raw === null ? [] : JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(value)) return [];

  let lines: readonly CartLine[] = [];
  for (const item of value) {
    lines = addCartItem(lines, item).lines;
  }
  return lines;
}
