import fs from "node:fs";

const layout = fs.readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
const homepage = fs.readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");

if (!layout.includes('<DeferredAnalytics />')) {
  throw new Error("Analytics must use the interaction/idle deferred loader so they do not compete with first paint.");
}

if (!homepage.includes("DeferredHomeTestimonials")) {
  throw new Error("Homepage testimonials must load through the deferred wrapper.");
}

if (homepage.includes('import TestimonialsMarquee from "@/components/TestimonialsMarquee"')) {
  throw new Error("Homepage must not eagerly import TestimonialsMarquee.");
}

if (homepage.includes('import { CircularGallery } from "@/components/ui/circular-gallery"')) {
  throw new Error("Homepage must not eagerly import CircularGallery.");
}

console.log("Homepage analytics and testimonial/gallery startup work are deferred.");
