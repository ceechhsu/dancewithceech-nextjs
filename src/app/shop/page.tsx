import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Nav from "@/components/Nav";
import ProductCard from "./ProductCard";
import { products } from "./products";
import styles from "./shop.module.css";

export const metadata: Metadata = {
  title: "Got Rhythm? Shop Preview | Dance With Ceech",
  description: "Preview the Dance With Ceech Got Rhythm? tee and hoodie.",
  robots: { index: false, follow: false },
};

export default function ShopPage() {
  return (
    <>
      <Nav />
      <main className={styles.shop}>
        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Dance With Ceech Shop</p>
            <h1 className={styles.title}>Got <em>Rhythm?</em></h1>
            <p className={styles.intro}>
              You need rhythm, I’ll lend you some.
            </p>
          </div>
          <div className={styles.launchNote}>
            <p className={styles.launchTitle}>Prelaunch preview</p>
            <p>Explore the tee and hoodie. Pricing and ordering details will follow at launch.</p>
          </div>
        </header>

        <section className={styles.products} aria-label="Got Rhythm? apparel">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </section>
      </main>
      <Footer />
    </>
  );
}
