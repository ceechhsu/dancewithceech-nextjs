"use client";

import Image from "next/image";
import { useState, type CSSProperties, type FormEvent } from "react";
import { MAX_CART_QUANTITY, type CartLine } from "./cart";
import { formatPrice, getRetailPrice, getSizes, type Product, type View } from "./products";
import styles from "./shop.module.css";

const views = [
  { id: "front", label: "Front", artwork: "Circular Dance With Ceech logo with You Need Rhythm, I’ll Lend You Some lettering" },
  { id: "back", label: "Back", artwork: "Got Rhythm? lettering" },
] as const;

type Props = {
  product: Product;
  cartReady: boolean;
  onAdd: (line: CartLine) => { added: number; quantity: number };
};

export default function ProductCard({ product, cartReady, onAdd }: Props) {
  const [colorId, setColorId] = useState(product.defaultColor);
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notice, setNotice] = useState("");
  const [viewId, setViewId] = useState<View>("front");
  const [failedMockups, setFailedMockups] = useState<ReadonlySet<string>>(() => new Set());
  const color = product.colors.find(({ id }) => id === colorId) ?? product.colors[0];
  const availableSizes = getSizes(product, color.id);
  const prices = availableSizes.map((option) => getRetailPrice(product, color.id, option));
  const startingPrice = prices.length > 0 && prices.every((value) => value !== null)
    ? Math.min(...prices)
    : null;
  const price = size ? getRetailPrice(product, color.id, size) : startingPrice;
  const priceText = price === null ? "Price pending" : `${size ? "" : "From "}${formatPrice(price)}`;
  const view = views[viewId === "front" ? 0 : 1];
  const imageUrl = product.mockups[color.id]?.[view.id];
  const mockup = imageUrl && !failedMockups.has(imageUrl) ? imageUrl : undefined;
  const artwork = `/images/shop/${view.id}-${color.ink}.webp`;
  const imageDescription = mockup
    ? `${product.name} in ${color.name}, ${view.id} view with ${view.artwork}`
    : `${view.artwork}, ${color.ink === "dark" ? "black" : "white"} print for ${color.name}`;

  function selectColor(id: string) {
    setColorId(id);
    if (!getSizes(product, id).includes(size)) setSize("");
    setNotice("");
  }

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requested = Number(quantity);
    const result = onAdd({ productId: product.id, colorId: color.id, size, quantity: requested });
    if (!result.added) {
      setNotice(result.quantity
        ? `This selection has reached the ${MAX_CART_QUANTITY}-item limit.`
        : "Choose an available size and a valid quantity.");
      return;
    }
    const added = `Added ${result.added} × ${product.name}, ${color.name}, ${size}. ${result.quantity} in cart.`;
    setNotice(result.added === requested ? added : `${added} Cart limit reached for this selection.`);
  }

  return (
    <article className={styles.card} aria-labelledby={`${product.id}-title`}>
      <div className={styles.productHeader}>
        <div>
          <h2 id={`${product.id}-title`}>{product.name}</h2>
          <p>{product.garment}</p>
        </div>
        <div className={styles.productPrice} role="group" aria-label="Unit price" aria-live="polite">
          {priceText}
        </div>
      </div>

      <div className={styles.gallery}>
        <figure className={styles.stage} data-artwork={mockup ? undefined : color.ink}>
          <Image
            src={mockup ?? artwork}
            alt={imageDescription}
            fill
            sizes="(max-width: 719px) calc(100vw - 32px), (max-width: 1239px) 48vw, 568px"
            className={mockup ? styles.mockup : styles.artwork}
            fetchPriority={viewId === "front" && colorId === product.defaultColor ? "high" : "auto"}
            referrerPolicy="no-referrer"
            onError={mockup
              ? () => setFailedMockups((failed) => new Set(failed).add(mockup))
              : undefined}
            unoptimized
          />
          <figcaption className={styles.visuallyHidden} aria-live="polite" aria-atomic="true">
            {`${color.name}, ${view.id} ${mockup ? "mockup" : "artwork preview"}`}
          </figcaption>
          {!mockup && <span className={styles.artworkLabel}>Artwork preview</span>}
        </figure>

        <fieldset className={styles.views}>
          <legend className={styles.visuallyHidden}>{product.name} view</legend>
          {views.map(({ id, label }) => (
            <label key={id} className={styles.viewOption}>
              <input
                className={styles.visuallyHidden}
                type="radio"
                name={`${product.id}-view`}
                checked={viewId === id}
                onChange={() => setViewId(id)}
              />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
      </div>

      <form className={styles.productDetails} onSubmit={handleAdd}>
        <fieldset className={styles.colorOptions}>
          <legend className={styles.visuallyHidden}>Garment color</legend>
          <p>Color <strong>{color.name}</strong></p>
          <div className={styles.swatches}>
            {product.colors.map((option) => (
              <label key={option.id} className={styles.swatch} title={option.name}>
                <input
                  className={styles.visuallyHidden}
                  type="radio"
                  name={`${product.id}-color`}
                  aria-label={option.name}
                  checked={colorId === option.id}
                  onChange={() => selectColor(option.id)}
                />
                <span style={{ "--swatch": option.swatch } as CSSProperties} aria-hidden="true" />
              </label>
            ))}
          </div>
        </fieldset>
        <p className={styles.fit}>{product.fit}</p>

        <div className={styles.purchaseFields}>
          <label className={styles.purchaseField}>
            Size
            <select
              value={size}
              required
              onChange={(event) => {
                setSize(event.target.value);
                setNotice("");
              }}
            >
              <option value="" disabled>Select a size</option>
              {availableSizes.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className={styles.purchaseField}>
            Quantity
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_CART_QUANTITY}
              step={1}
              required
              value={quantity}
              onChange={(event) => {
                setQuantity(event.target.value);
                setNotice("");
              }}
            />
          </label>
        </div>
        <button type="submit" className={styles.addButton} disabled={!cartReady}>Add to Cart</button>
        <div className={styles.cartFeedback}>
          <p role="status" aria-atomic="true">{notice}</p>
          {notice && <a href="#shop-cart-heading">View cart</a>}
        </div>
      </form>
    </article>
  );
}
