import { businessSchema } from "@/lib/private-lesson-details";

export const homepageFaqs = [
  { question: "Is this for adult beginners?", answer: "Yes. Coaching is for adults 18 and older, from beginners to experienced dancers. Ceech identifies the rhythm, balance or coordination skill that needs work and chooses a specific drill." },
  { question: "What does one online coaching cycle include?", answer: "Submit one dance video after purchasing a cycle or pack. Ceech sends recorded feedback within three business days. Then arrange the next available 30-minute Google Meet to practice corrections together. That meeting completes the cycle. Additional recorded reviews are not included in the same cycle." },
  { question: "How much does online coaching cost?", answer: "A single cycle is $80. Five cycles are $300, used within three months of purchase; ten cycles are $500, used within six months. These are one-time purchases with no automatic renewal. Appointments are arranged in Pacific Time." },
  { question: "What happens in the free consultation?", answer: "You and Ceech talk by phone for 30 minutes about your goals, experience and which option fits. There is no obligation. The consultation is separate from the 30-minute Google Meet included in a paid coaching cycle." },
  { question: "Can I try something free first?", answer: "Yes. Explore the free tutorials or BeatFirst rhythm trainer. Prospective virtual students can also request one free video evaluation per person. These are optional; you can book a consultation directly." },
  { question: "What if I need to reschedule?", answer: "Give at least 24 hours’ notice. Late cancellations and missed appointments count as a used session; genuine emergencies may be considered case by case. If Ceech cancels, the lesson is rescheduled without using a session. See the private lesson FAQs for preparation and recording policies." },
];

export const homepageSchema = {
  "@context": "https://schema.org",
  "@graph": [
    businessSchema,
    {
      "@type": "Service",
      "@id": "https://dancewithceech.com/private-lessons#service",
      name: "Online dance coaching and private lessons in San Jose",
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
