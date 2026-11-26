"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import type { Product, View } from "./products";
import styles from "./shop.module.css";

const views = [
  { id: "front", label: "Front", artwork: "Circular Dance With Ceech logo with You Need Rhythm, I’ll Lend You Some lettering" },
  { id: "back", label: "Back", artwork: "Got Rhythm? lettering" },
] as const;

export default function ProductCard({ product }: { product: Product }) {
  const [colorId, setColorId] = useState(product.defaultColor);
  const [viewId, setViewId] = useState<View>("front");
  const [failedMockups, setFailedMockups] = useState<ReadonlySet<string>>(() => new Set());
  const color = product.colors.find(({ id }) => id === colorId) ?? product.colors[0];
  const view = views[viewId === "front" ? 0 : 1];
  const imageUrl = product.mockups[color.id]?.[view.id];
  const mockup = imageUrl && !failedMockups.has(imageUrl) ? imageUrl : undefined;
  const artwork = `/images/shop/${view.id}-${color.ink}.webp`;
  const imageDescription = mockup
    ? `${product.name} in ${color.name}, ${view.id} view with ${view.artwork}`
    : `${view.artwork}, ${color.ink === "dark" ? "black" : "white"} print for ${color.name}`;

  return (
    <article className={styles.card} aria-labelledby={`${product.id}-title`}>
      <div className={styles.productHeader}>
        <div>
          <h2 id={`${product.id}-title`}>{product.name}</h2>
          <p>{product.garment}</p>
        </div>
        <p className={styles.sizes}>
          <span className={styles.visuallyHidden}>Sizes </span>{product.sizes}
        </p>
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

      <div className={styles.productDetails}>
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
                  onChange={() => setColorId(option.id)}
                />
                <span style={{ "--swatch": option.swatch } as CSSProperties} aria-hidden="true" />
              </label>
            ))}
          </div>
        </fieldset>
        <p className={styles.fit}>{product.fit}</p>
      </div>
    </article>
  );
}
