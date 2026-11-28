import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Nav from "@/components/approved-pages/Nav";
import pageStyles from "@/components/approved-pages/PageScope.module.css";
import { isShopProduction, SHOP_PATH } from "@/lib/shop-publication";
import ProductCard from "./ProductCard";
import { getProductPriceRange, products } from "./products";
import styles from "./shop.module.css";

const production = isShopProduction();
const publishedListings = {
  tee: "https://dance-with-ceech.printify.me/product/35136313/unisex-garment-dyed-t-shirt",
  hoodie: "https://dance-with-ceech.printify.me/product/35136351/got-rhythm-dancing-figure-hoodie",
};

export const metadata: Metadata = production
  ? {
    title: "Got Rhythm? Shop | Dance With Ceech",
    description: "Shop the Dance With Ceech Got Rhythm? tee and hoodie. Explore colors and sizes, then order on Printify.",
    alternates: { canonical: `https://dancewithceech.com${SHOP_PATH}` },
  }
  : {
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
  const listings = production ? publishedListings : {
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
            <p className={styles.launchTitle}>{production ? "Order on Printify" : "Prelaunch preview"}</p>
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
