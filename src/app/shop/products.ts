import mockups from "./mockups.json";

export type View = "front" | "back";

type Color = {
  id: string;
  name: string;
  swatch: string;
  ink: "dark" | "light";
};

export type Product = {
  id: string;
  name: string;
  garment: string;
  sizes: string;
  fit: string;
  colors: readonly Color[];
  defaultColor: string;
  mockups: Partial<Record<string, Partial<Record<View, string>>>>;
};

const white: Color = { id: "white", name: "White", swatch: "#f5f4f0", ink: "dark" };
const black: Color = { id: "black", name: "Black", swatch: "#202020", ink: "light" };

export const products: readonly Product[] = [
  {
    id: "tee",
    name: "Got Rhythm? Tee",
    garment: "Comfort Colors 1717 · Garment-dyed tee",
    sizes: "S–4XL",
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
    sizes: "S–5XL",
    fit: "Unisex · Sizes vary by color",
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
