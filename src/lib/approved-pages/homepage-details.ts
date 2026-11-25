import { businessSchema } from "@/lib/private-lesson-details";

export const homepageFaqs = [
  { question: "Who is Dance Floor Ready for?", answer: "It’s for adults who’ve paid for dance classes or tutorials and still feel stuck when nobody’s leading. If you want to learn to freestyle with short drills and personal feedback, the fit questions will help you see if it makes sense for you." },
  { question: "How does the online coaching work?", answer: "Dance Floor Ready is a 30-day pilot with a short kickoff call and private video feedback from Ceech. Practice in two-minute bursts and send at least one clip each week, with one optional follow-up. On Day 1 and Day 30, film the same part of the same song so you can compare your clips." },
  { question: "How do I get started with Dance Floor Ready?", answer: "Open Dance Floor Ready and answer a few short fit questions. If the coaching fits your goals and schedule, you can book a free 30-minute phone call with Ceech." },
  { question: "Can I still book in-person lessons in San Jose?", answer: "Yes. Ceech offers 60-minute private hip-hop lessons for adults at Get Down Dance Studios in San Jose, by appointment." },
  { question: "Can I try something free first?", answer: "Yes. Try the free tutorials or the BeatFirst rhythm trainer. Dance Floor Ready also includes a free two-minute drill for visitors who want a smaller first step." },
  { question: "What if I need to reschedule an in-person lesson?", answer: "Give at least 24 hours’ notice. Late cancellations and missed appointments count as a used session; genuine emergencies may be considered case by case. If Ceech cancels, the lesson is rescheduled without using a session. See the San Jose lesson page for preparation and recording policies." },
];

export const homepageSchema = {
  "@context": "https://schema.org",
  "@graph": [
    businessSchema,
    {
      "@type": "Service",
      "@id": "https://dancewithceech.com/dance-floor-ready#service",
      name: "Dance Floor Ready",
      url: "https://dancewithceech.com/dance-floor-ready",
      description: "A 30-day private online hip-hop coaching pilot for adults, with short freestyle drills and personal video feedback from Ceech.",
      provider: { "@id": businessSchema["@id"] },
      serviceType: "Private online hip-hop dance coaching",
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
