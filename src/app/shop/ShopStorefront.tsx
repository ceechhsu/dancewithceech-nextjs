"use client";

import { ShoppingBag } from "lucide-react";
import CartPanel from "./CartPanel";
import ProductCard from "./ProductCard";
import { cartLineKey } from "./cart";
import { getRetailPrice, products } from "./products";
import { useShopCart } from "./useShopCart";
import styles from "./shop.module.css";

export default function ShopStorefront() {
  const { lines, ready, addItem, updateQuantity, removeItem } = useShopCart();
  const itemCount = lines.reduce((total, line) => total + line.quantity, 0);
  const items = lines.flatMap((line) => {
    const product = products.find(({ id }) => id === line.productId);
    const color = product?.colors.find(({ id }) => id === line.colorId);
    if (!product || !color) return [];
    return [{
      id: cartLineKey(line),
      productName: product.name,
      colorName: color.name,
      size: line.size,
      quantity: line.quantity,
      unitPrice: getRetailPrice(product, color.id, line.size),
    }];
  });

  return (
    <>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Dance With Ceech Shop</p>
          <h1 className={styles.title}>Got <em>Rhythm?</em></h1>
          <p className={styles.intro}>You need rhythm, I’ll lend you some.</p>
        </div>
        <div className={styles.shopUtilities}>
          <div className={styles.launchNote}>
            <p className={styles.launchTitle}>Prelaunch preview</p>
            <p>Try the cart. Ordering opens at launch.</p>
          </div>
          <a className={styles.cartLink} href="#shop-cart-heading">
            <ShoppingBag size={17} aria-hidden="true" />
            View cart ({itemCount})
          </a>
        </div>
      </header>

      <section className={styles.products} aria-label="Got Rhythm? apparel">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} cartReady={ready} onAdd={addItem} />
        ))}
      </section>
      <CartPanel lines={items} isReady={ready} onUpdateQuantity={updateQuantity} onRemove={removeItem} />
    </>
  );
}
