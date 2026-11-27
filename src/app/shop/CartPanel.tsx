"use client";

import { useId, useRef, useState, type MouseEvent } from "react";
import { MAX_CART_QUANTITY } from "./cart";
import { formatPrice } from "./products";
import styles from "./cart.module.css";
import shopStyles from "./shop.module.css";

type CartPanelLine = {
  id: string;
  productName: string;
  colorName: string;
  size: string;
  quantity: number;
  unitPrice: number | null;
};

type CartPanelProps = {
  lines: readonly CartPanelLine[];
  isReady?: boolean;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
};

function CartQuantity({
  description,
  quantity,
  onUpdate,
}: {
  description: string;
  quantity: number;
  onUpdate: (quantity: number) => void;
}) {
  const inputId = useId();
  const [draft, setDraft] = useState<string | null>(null);

  function commitQuantity(value: string) {
    setDraft(null);
    const nextQuantity = Number(value);
    if (Number.isInteger(nextQuantity) && nextQuantity >= 1 && nextQuantity <= MAX_CART_QUANTITY
      && nextQuantity !== quantity) {
      onUpdate(nextQuantity);
    }
  }

  return (
    <div className={styles.quantity}>
      <label htmlFor={inputId}>Quantity<span className={shopStyles.visuallyHidden}> for {description}</span></label>
      <div className={styles.stepper}>
        <button
          type="button"
          aria-label={`Decrease quantity for ${description}`}
          disabled={quantity <= 1}
          onClick={() => onUpdate(quantity - 1)}
        >
          −
        </button>
        <input
          id={inputId}
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_CART_QUANTITY}
          step={1}
          value={draft ?? quantity}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onBlur={(event) => commitQuantity(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitQuantity(event.currentTarget.value);
            }
            if (event.key === "Escape") setDraft(null);
          }}
        />
        <button
          type="button"
          aria-label={`Increase quantity for ${description}`}
          disabled={quantity >= MAX_CART_QUANTITY}
          onClick={() => onUpdate(quantity + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function CartPanel({ lines, isReady = true, onUpdateQuantity, onRemove }: CartPanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subtotal = lines.reduce<number | null>((total, { unitPrice, quantity }) =>
    total === null || unitPrice === null ? null : total + unitPrice * quantity, 0);
  const showPrices = lines.length > 0 && subtotal !== null;

  function removeLine(event: MouseEvent<HTMLButtonElement>, id: string) {
    const row = event.currentTarget.closest("li");
    const adjacentRow = row?.nextElementSibling ?? row?.previousElementSibling;
    const nextFocus = adjacentRow?.querySelector<HTMLButtonElement>("button[data-cart-remove]") ?? headingRef.current;
    onRemove(id);
    nextFocus?.focus();
  }

  return (
    <section id="shop-cart" className={styles.cart} aria-labelledby="shop-cart-heading" aria-busy={!isReady}>
      <h2 id="shop-cart-heading" className={styles.title} tabIndex={-1} ref={headingRef}>Your cart</h2>
      {!isReady ? (
        <p className={styles.empty} role="status">Loading your cart…</p>
      ) : lines.length === 0 ? (
        <p className={styles.empty}>Your cart is empty. Choose a color and size above to add an item.</p>
      ) : (
        <ul className={styles.lines} role="list">
          {lines.map((line) => {
            const description = `${line.productName}, ${line.colorName}, size ${line.size}`;
            return (
              <li key={line.id} className={styles.line}>
                <div className={styles.item}>
                  <h3>{line.productName}</h3>
                  <p>{line.colorName} · Size {line.size}</p>
                </div>
                <CartQuantity
                  description={description}
                  quantity={line.quantity}
                  onUpdate={(quantity) => onUpdateQuantity(line.id, quantity)}
                />
                {showPrices && line.unitPrice !== null && (
                  <div className={styles.price}>
                    <p><span className={shopStyles.visuallyHidden}>Line total </span>{formatPrice(line.unitPrice * line.quantity)}</p>
                    <p>{formatPrice(line.unitPrice)} each</p>
                  </div>
                )}
                <button
                  className={styles.remove}
                  type="button"
                  aria-label={`Remove ${description}`}
                  data-cart-remove
                  onClick={(event) => removeLine(event, line.id)}
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className={styles.summary}>
        <p>Checkout is unavailable in this preview.</p>
        {isReady && showPrices && (
          <dl className={styles.subtotal}>
            <dt>Subtotal</dt>
            <dd>{formatPrice(subtotal)}</dd>
          </dl>
        )}
        {isReady && lines.length > 0 && subtotal === null && <p>Pricing pending for one or more items.</p>}
      </div>
    </section>
  );
}
