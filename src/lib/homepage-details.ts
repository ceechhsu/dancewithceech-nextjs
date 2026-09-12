import { businessSchema } from "@/lib/private-lesson-details";

export const homepageFaqs = [
  {
    question: "What can I learn with Dance With Ceech?",
    answer: "Explore hip-hop, locking, popping, and house dance, with an emphasis on rhythm, balance, and coordination. You can learn through dance tutorials, private coaching, and focused programs such as the Running Man Method.",
  },
  {
    question: "How is personal coaching different from following a dance tutorial?",
    answer: "A tutorial demonstrates a move for you to practice at your own pace. Personal coaching gives you feedback on your own dancing and drills chosen for the skills you need to develop. Dance With Ceech offers both online coaching and in-person private lessons in San Jose.",
  },
  {
    question: "What is Ceech’s approach to teaching dance?",
    answer: "Ceech breaks movement into clear steps and helps you understand what to change when a move feels awkward. The focus is on building rhythm, balance, and coordination through specific corrections and practice, one step at a time.",
  },
  {
    question: "What can I explore before choosing a dance program?",
    answer: "Watch the dance tutorials to see how Ceech teaches, try the free BeatFirst rhythm trainer, and read about the available coaching options. If you would like help choosing, book a free 30-minute phone consultation to discuss your goals.",
  },
];

export const homepageSchema = {
  "@context": "https://schema.org",
  "@graph": [
    businessSchema,
    {
      "@type": "Service",
      "@id": "https://dancewithceech.com/private-lessons#service",
      name: "Private dance lessons in San Jose and online",
      url: "https://dancewithceech.com/private-lessons",
      description: "Personalized dance instruction for adults, with in-person private lessons in San Jose and online coaching that combines recorded feedback with a 30-minute Google Meet session.",
      provider: { "@id": businessSchema["@id"] },
      serviceType: "Private dance instruction",
      areaServed: ["San Francisco Bay Area", "Worldwide online"],
      audience: { "@type": "Audience", audienceType: "Adults 18 and older" },
    },
    {
      "@type": "FAQPage",
      "@id": "https://dancewithceech.com/#faq",
      url: "https://dancewithceech.com/#faq",
      mainEntity: homepageFaqs.map(({ question, answer }) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      })),
    },
  ],
};
