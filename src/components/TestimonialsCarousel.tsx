'use client';

import { CircularTestimonials } from "@/components/ui/circular-testimonials";

const testimonials = [
  {
    videoId: "I68OCXhkaEo",
    name: "Dax Mills",
    designation: "Community College Student",
    quote: "Ceech breaks moves down so you actually understand them. He makes it look incredible — then shows you exactly how.",
  },
  {
    videoId: "0DKQ1PPW7Ag",
    name: "Cambell",
    designation: "Community College Student",
    quote: "He gets into the nitty gritty of every step — breaks it down until you know exactly how to do it properly.",
  },
  {
    videoId: "h32DyBzyi4Q",
    name: "Anabelle",
    designation: "Community College Student",
    quote: "In the little time I've known Ceech, he's helped me improve so much — not just as a dancer, but as a person.",
  },
];

export default function TestimonialsCarousel() {
  return (
    <CircularTestimonials
      testimonials={testimonials}
      autoplay={true}
    />
  );
}
