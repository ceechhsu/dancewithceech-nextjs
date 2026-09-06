export type LessonFaq = { question: string; answer: string };

export const businessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://dancewithceech.com/#organization",
  name: "Dance With Ceech",
  alternateName: "DanceWithCeech",
  url: "https://dancewithceech.com",
  telephone: "+14086573771",
  email: "dancewithceech@gmail.com",
  logo: "https://dancewithceech.com/logo-mark.png",
  address: {
    "@type": "PostalAddress",
    streetAddress: "196 Jackson St",
    addressLocality: "San Jose",
    addressRegion: "CA",
    postalCode: "95112",
    addressCountry: "US",
  },
  geo: { "@type": "GeoCoordinates", latitude: 37.3488633, longitude: -121.8944247 },
  sameAs: [
    "https://maps.app.goo.gl/UwJFWssFCYNC5Zyc7",
    "https://www.instagram.com/dancewithceech",
    "https://www.youtube.com/@dancewithceech",
  ],
};

export const instructorSchema = {
  "@type": "Person",
  "@id": "https://dancewithceech.com/about#ceech",
  name: "Ceech Hsu",
  url: "https://dancewithceech.com/about",
  jobTitle: "Dance instructor",
  description: "Teaching dance since 1998 and at Mission College since 2002. Master of Arts in Kinesiology from Fresno Pacific University.",
  worksFor: { "@id": businessSchema["@id"] },
};

export const aboutProfileSchema = {
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  "@id": "https://dancewithceech.com/about#profile",
  url: "https://dancewithceech.com/about",
  mainEntity: instructorSchema,
};

const beginners: LessonFaq = {
  question: "Do I need dance experience?",
  answer: "No. Lessons are for adults 18 and older, from complete beginners to experienced dancers. Ceech identifies what needs attention and teaches one step at a time. You can work on multiple styles and request your own songs.",
};
const studio: LessonFaq = {
  question: "Where and when are in-person lessons held?",
  answer: "Lessons are by appointment only, normally Saturdays between 9 a.m. and 5 p.m. Pacific Time at Get Down Dance Studios, 196 Jackson St, San Jose, CA 95112, in Japantown. Other times may be available by special request. Ceech usually contacts students around Tuesday to confirm the upcoming Saturday. Appointments are arranged week by week, subject to availability.",
};
const parking: LessonFaq = {
  question: "Where can I park?",
  answer: "Paid street parking only. There is no dedicated parking lot. Check posted signs for fees and time limits, and allow time to park before your appointment.",
};
const inPersonPrice: LessonFaq = {
  question: "Are studio fees included?",
  answer: "Yes. A 60-minute lesson is $250, five sessions are $1,150, and ten sessions are $2,100. All include the studio fee. In-person packages expire one year after the first lesson. Extra participants, music editing, travel, or additional rehearsal time are quoted separately.",
};
const virtual: LessonFaq = {
  question: "What is one Virtual Coaching Cycle?",
  answer: "Submit one dance video. Ceech sends recorded feedback within three business days. Then arrange the next available 30-minute Live Coaching Session on Google Meet to work through the feedback together. That meeting completes the cycle. Additional recorded reviews are not included in the same cycle.",
};
const virtualPrice: LessonFaq = {
  question: "How much is virtual coaching, and do packs expire?",
  answer: "A 10-Cycle Pack is $500 and expires six months after purchase. A 5-Cycle Pack is $300 and expires three months after purchase. A Single Cycle is $80. These are one-time purchases with no automatic renewal. Adult students can join worldwide; appointments are arranged in Pacific Time.",
};
const practice: LessonFaq = {
  question: "Can I record the drills for practice?",
  answer: "Yes. Ceech normally uses the final 5 to 10 minutes of your lesson to demonstrate your custom drills for a practice recording. Recordings are for your personal practice only. Do not share, sell, publish, or redistribute them without permission.",
};
const cancellation: LessonFaq = {
  question: "What if I need to cancel or reschedule?",
  answer: "Give at least 24 hours' notice to reschedule. Late cancellations and missed appointments count as a used session; genuine emergencies may be considered case by case. If Ceech cancels, the lesson is rescheduled without using a session from your package.",
};
const preparation: LessonFaq = {
  question: "What should I wear or set up?",
  answer: "In person, wear comfortable, loose clothing and comfortable shoes; no bare feet or sandals. For virtual coaching, have a phone or computer for Google Meet and at least 5 feet by 5 feet of clear, safe floor space. For homework, use a phone or video recorder and a way to play music. A tripod helps keep you in view.",
};
const travel: LessonFaq = {
  question: "Can you come to my home or event venue?",
  answer: "Travel may be available case by case for an additional fee. Discuss the location, participants, and schedule with Ceech before booking. Regular in-person lessons take place in San Jose; virtual coaching is available worldwide.",
};

export const lessonFaqs = [beginners, studio, parking, inPersonPrice, virtual, virtualPrice, practice, cancellation, preparation];
export const sanJoseFaqs = [beginners, studio, parking, inPersonPrice, practice, cancellation];
export const bayAreaFaqs = [studio, parking, travel, virtual, virtualPrice, cancellation];

export function buildLessonSchema(path: string, name: string, faqs: LessonFaq[], virtualAvailable = true) {
  const url = `https://dancewithceech.com${path}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      businessSchema,
      {
        "@type": "Service",
        "@id": `${url}#service`,
        name,
        url,
        provider: { "@id": businessSchema["@id"] },
        serviceType: "Private dance instruction",
        areaServed: virtualAvailable ? ["San Francisco Bay Area", "Worldwide online"] : "San Jose",
        audience: { "@type": "Audience", audienceType: "Adults 18 and older" },
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: faqs.map(({ question, answer }) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: { "@type": "Answer", text: answer },
        })),
      },
    ],
  };
}
