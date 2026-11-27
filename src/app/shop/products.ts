import mockups from "./mockups.json";
import savedVariants from "./variant-prices.json";

export type View = "front" | "back";

type Color = {
  id: string;
  name: string;
  swatch: string;
  ink: "dark" | "light";
};

type PricesBySize = Partial<Record<string, number | null>>;
const variants: Record<"tee" | "hoodie", Partial<Record<string, PricesBySize>>> = savedVariants;
const sizes = ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"] as const;

export type Product = {
  id: keyof typeof variants;
  name: string;
  garment: string;
  fit: string;
  colors: readonly Color[];
  defaultColor: string;
  mockups: Partial<Record<string, Partial<Record<View, string>>>>;
};

const white: Color = { id: "white", name: "White", swatch: "#f5f4f0", ink: "dark" };
const black: Color = { id: "black", name: "Black", swatch: "#202020", ink: "light" };
const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: savedVariants.currency });

export const products: readonly Product[] = [
  {
    id: "tee",
    name: "Got Rhythm? Tee",
    garment: "Comfort Colors 1717 · Garment-dyed tee",
    fit: "Unisex",
    defaultColor: "black",
    colors: [
      black,
      white,
      { id: "graphite", name: "Graphite", swatch: "#464241", ink: "light" },
      { id: "bay", name: "Bay", swatch: "#a6ad9d", ink: "dark" },
      { id: "island-reef", name: "Island Reef", swatch: "#abefbc", ink: "dark" },
      { id: "chambray", name: "Chambray", swatch: "#cce5ec", ink: "dark" },
      { id: "blossom", name: "Blossom", swatch: "#efc7d2", ink: "dark" },
    ],
    mockups: mockups.tee,
  },
  {
    id: "hoodie",
    name: "Got Rhythm? Hoodie",
    garment: "Gildan 18500 · Heavy Blend hoodie",
    fit: "Unisex",
    defaultColor: "white",
    colors: [
      white,
      black,
      { id: "ash", name: "Ash", swatch: "#d9dbda", ink: "dark" },
      { id: "fan-charcoal-heather", name: "Fan Charcoal Heather", swatch: "#333536", ink: "light" },
    ],
    mockups: mockups.hoodie,
  },
];

function getColorPrices(product: Product, colorId: string): PricesBySize | undefined {
  const color = product.colors.find(({ id }) => id === colorId);
  return color ? variants[product.id][color.name] : undefined;
}

export function getColorSizeRange(product: Product, colorId: string): string {
  const prices = getColorPrices(product, colorId);
  const available = prices ? sizes.filter((size) => Object.hasOwn(prices, size)) : [];
  if (available.length < 2) return available[0] ?? "";
  return `${available[0]}–${available[available.length - 1]}`;
}

export function getProductPriceRange(id: Product["id"]): string {
  const prices = Object.values(savedVariants[id]).flatMap((color) => Object.values(color));
  if (prices.length === 0) return "Price pending";
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const min = dollars.format(low / 100);
  return low === high ? min : `${min}–${dollars.format(high / 100)}`;
}
