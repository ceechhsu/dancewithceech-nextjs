import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Nav from "@/components/approved-pages/Nav";
import pageStyles from "@/components/approved-pages/PageScope.module.css";
import ProductCard from "./ProductCard";
import { getProductPriceRange, products } from "./products";
import styles from "./shop.module.css";

export const metadata: Metadata = {
  title: "Got Rhythm? Shop Preview | Dance With Ceech",
  description: "Preview the Dance With Ceech Got Rhythm? tee and hoodie.",
  robots: { index: false, follow: false },
};

function readPrintifyListing(value: string | undefined) {
  if (!value) return undefined;
  const url = URL.parse(value);
  if (url?.protocol !== "https:" || !url.hostname.endsWith(".printify.me")
    || url.username || url.password || url.port
    || url.pathname === "/") return undefined;
  return url.href;
}

export default function ShopPage() {
  const listings = {
    tee: readPrintifyListing(process.env.PRINTIFY_POPUP_TEE_URL),
    hoodie: readPrintifyListing(process.env.PRINTIFY_POPUP_HOODIE_URL),
  };
  const hasListing = Boolean(listings.tee || listings.hoodie);

  return (
    <div className={pageStyles.scope}>
      <a href="#main-content" className={pageStyles.skipLink}>Skip to content</a>
      <Nav />
      <main id="main-content" tabIndex={-1} className={styles.shop}>
        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Dance With Ceech Shop</p>
            <h1 className={styles.title}>Got <em>Rhythm?</em></h1>
            <p className={styles.intro}>You need rhythm, I’ll lend you some.</p>
          </div>
          <div className={styles.launchNote}>
            <p className={styles.launchTitle}>Prelaunch preview</p>
            <p>
              {hasListing
                ? "Choose your color, size, and quantity on Printify."
                : "Choose your color, size, and quantity on Printify when ordering opens."}
            </p>
          </div>
        </header>

        <section className={styles.products} aria-label="Got Rhythm? apparel">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              priceRange={getProductPriceRange(product.id)}
              printifyUrl={listings[product.id]}
            />
          ))}
        </section>
      </main>
      <Footer />
    </div>
  );
}
