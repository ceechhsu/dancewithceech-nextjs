import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Nav from "@/components/approved-pages/Nav";
import pageStyles from "@/components/approved-pages/PageScope.module.css";
import ShopStorefront from "./ShopStorefront";
import styles from "./shop.module.css";

export const metadata: Metadata = {
  title: "Got Rhythm? Shop Preview | Dance With Ceech",
  description: "Preview the Dance With Ceech Got Rhythm? tee and hoodie.",
  robots: { index: false, follow: false },
};

export default function ShopPage() {
  return (
    <div className={pageStyles.scope}>
      <a href="#main-content" className={pageStyles.skipLink}>Skip to content</a>
      <Nav />
      <main id="main-content" tabIndex={-1} className={styles.shop}>
        <ShopStorefront />
      </main>
      <Footer />
    </div>
  );
}
