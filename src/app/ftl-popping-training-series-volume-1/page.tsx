import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FTL Popping Training Series Volume 1 | Dance With Ceech",
  description:
    "This 30 days popping training program is designed for beginners to get started with popping.",
};

type VideoItem = {
  id: string;
  title: string;
  duration: string;
};

type DayEntry =
  | { type: "training"; videos: VideoItem[]; totalMin: string }
  | { type: "review"; videos: VideoItem[]; notes: string[] }
  | { type: "rest"; videos: VideoItem[]; label: string };

const schedule: { day: number; entry: DayEntry }[] = [
  {
    day: 1,
    entry: {
      type: "training",
      totalMin: "~37 min",
      videos: [
        { id: "nknBVUMoQ0E", title: "Arm Pop", duration: "~10 min" },
        { id: "pzFZ-yP8j7E", title: "Leg Pop", duration: "~12 min" },
        { id: "2ALo0XwKBIc", title: "Ep.1 Popping Drills", duration: "~15 min" },
      ],
    },
  },
  {
    day: 2,
    entry: {
      type: "training",
      totalMin: "~33 min",
      videos: [
        { id: "2ALo0XwKBIc", title: "Ep.1 Drills", duration: "~15 min" },
        { id: "cBox8Tqj8tk", title: "Ep.2 Drills", duration: "~13 min" },
        { id: "woY92TNFZSc", title: "Ep.1 FTL", duration: "~5 min" },
      ],
    },
  },
  {
    day: 3,
    entry: {
      type: "training",
      totalMin: "~34 min",
      videos: [
        { id: "-pyixyOl7VY", title: "Chest Pop", duration: "~6 min" },
        { id: "crKfyYbmQ14", title: "Neck Pop", duration: "~7 min" },
        { id: "216uyJM5R98", title: "Popping Choreography", duration: "~21 min" },
      ],
    },
  },
  {
    day: 4,
    entry: {
      type: "training",
      totalMin: "~34 min",
      videos: [
        { id: "cBox8Tqj8tk", title: "Ep.2 Drills", duration: "~13 min" },
        { id: "4ATqhNqInl8", title: "Ep.3 Drills", duration: "~16 min" },
        { id: "woY92TNFZSc", title: "Ep.1 FTL", duration: "~5 min" },
      ],
    },
  },
  {
    day: 5,
    entry: {
      type: "training",
      totalMin: "~44 min",
      videos: [
        { id: "2ALo0XwKBIc", title: "Ep.1 Drills", duration: "~15 min" },
        { id: "cBox8Tqj8tk", title: "Ep.2 Drills", duration: "~13 min" },
        { id: "4ATqhNqInl8", title: "Ep.3 Drills", duration: "~16 min" },
      ],
    },
  },
  {
    day: 6,
    entry: {
      type: "review",
      videos: [{ id: "woY92TNFZSc", title: "Ep.1 FTL", duration: "~5 min" }],
      notes: [
        "Video record yourself doing Ep. 1 FTL. Study yourself.",
        "Members of the paid program, submit your video for evaluation and feedback.",
      ],
    },
  },
  {
    day: 7,
    entry: {
      type: "rest",
      label: "Rest & Watch",
      videos: [
        { id: "-YmWso5dEps", title: "Popping Freestyle", duration: "~2 min" },
        { id: "HmtJ_4xbyas", title: "Grooving", duration: "~2 min" },
        { id: "f7GKAOxx0CU", title: "3 Popping Freestyles", duration: "~6 min" },
      ],
    },
  },
  {
    day: 8,
    entry: {
      type: "training",
      totalMin: "~51 min",
      videos: [
        { id: "4b3cTBfqRuU", title: "Popping Warm Up", duration: "~15 min" },
        { id: "4ATqhNqInl8", title: "Ep.3 Drills", duration: "~16 min" },
        { id: "pVTIeuVnCU8", title: "Ep.4 Drills", duration: "~20 min" },
      ],
    },
  },
  {
    day: 9,
    entry: {
      type: "training",
      totalMin: "~45 min",
      videos: [
        { id: "4ATqhNqInl8", title: "Ep.3 Drills", duration: "~16 min" },
        { id: "pVTIeuVnCU8", title: "Ep.4 Drills", duration: "~20 min" },
        { id: "bhcDgwGLQHA", title: "Ep.2 FTL", duration: "~9 min" },
      ],
    },
  },
  {
    day: 10,
    entry: {
      type: "training",
      totalMin: "~39 min",
      videos: [
        { id: "88GptZde3b0", title: "Ep.5 Drills", duration: "~15 min" },
        { id: "4b3cTBfqRuU", title: "Popping Warm Up", duration: "~15 min" },
        { id: "bhcDgwGLQHA", title: "Ep.2 FTL", duration: "~9 min" },
      ],
    },
  },
  {
    day: 11,
    entry: {
      type: "training",
      totalMin: "~51 min",
      videos: [
        { id: "4ATqhNqInl8", title: "Ep.3 Drills", duration: "~16 min" },
        { id: "pVTIeuVnCU8", title: "Ep.4 Drills", duration: "~20 min" },
        { id: "88GptZde3b0", title: "Ep.5 Drills", duration: "~15 min" },
      ],
    },
  },
  {
    day: 12,
    entry: {
      type: "training",
      totalMin: "~40 min",
      videos: [
        { id: "pVTIeuVnCU8", title: "Ep.4 Drills", duration: "~20 min" },
        { id: "88GptZde3b0", title: "Ep.5 Drills", duration: "~15 min" },
        { id: "bhcDgwGLQHA", title: "Ep.2 FTL", duration: "~9 min" },
      ],
    },
  },
  {
    day: 13,
    entry: {
      type: "review",
      videos: [{ id: "bhcDgwGLQHA", title: "Ep.2 FTL", duration: "~9 min" }],
      notes: [
        "Video record yourself doing Ep. 2 FTL. Study yourself.",
        "Members of the paid program, submit your video for evaluation and feedback.",
      ],
    },
  },
  {
    day: 14,
    entry: {
      type: "rest",
      label: "Rest & Watch",
      videos: [
        { id: "gVhcgfS2slY", title: "Popping X2 Ceech", duration: "~2 min" },
        { id: "Y1yURow9_4Q", title: "Arm Wave Inside Out", duration: "~15 min" },
        { id: "Xj1e8J0bLO0", title: "Ceech's Body Rock Solo", duration: "~1 min" },
      ],
    },
  },
  {
    day: 15,
    entry: {
      type: "training",
      totalMin: "~32 min",
      videos: [
        { id: "W6bMPnm1JBU", title: "Chest Isolation Drills", duration: "~12 min" },
        { id: "eE2FZuaX1sc", title: "Pivoting Heel Toe Drills", duration: "~13 min" },
        { id: "wbefRONiS8c", title: "Ep.3 FTL", duration: "~7 min" },
      ],
    },
  },
  {
    day: 16,
    entry: {
      type: "training",
      totalMin: "~36 min",
      videos: [
        { id: "W6bMPnm1JBU", title: "Chest Isolation Drills", duration: "~12 min" },
        { id: "eE2FZuaX1sc", title: "Pivoting Heel Toe Drills", duration: "~13 min" },
        { id: "hlU10aJGdFE", title: "Shoulder Isolation Drills", duration: "~11 min" },
      ],
    },
  },
  {
    day: 17,
    entry: {
      type: "training",
      totalMin: "~32 min",
      videos: [
        { id: "UoWvkNJ4fQA", title: "Balance Drills", duration: "~10 min" },
        { id: "88GptZde3b0", title: "Ep.5 Drills", duration: "~15 min" },
        { id: "wbefRONiS8c", title: "Ep.3 FTL", duration: "~7 min" },
      ],
    },
  },
  {
    day: 18,
    entry: {
      type: "training",
      totalMin: "~40 min",
      videos: [
        { id: "UoWvkNJ4fQA", title: "Balance Drills", duration: "~10 min" },
        { id: "88GptZde3b0", title: "Ep.5 Drills", duration: "~15 min" },
        { id: "2ALo0XwKBIc", title: "Ep.1 Drills", duration: "~15 min" },
      ],
    },
  },
  {
    day: 19,
    entry: {
      type: "training",
      totalMin: "~35 min",
      videos: [
        { id: "2ALo0XwKBIc", title: "Ep.1 Drills", duration: "~15 min" },
        { id: "cBox8Tqj8tk", title: "Ep.2 Drills", duration: "~13 min" },
        { id: "wbefRONiS8c", title: "Ep.3 FTL", duration: "~7 min" },
      ],
    },
  },
  {
    day: 20,
    entry: {
      type: "review",
      videos: [{ id: "wbefRONiS8c", title: "Ep.3 FTL", duration: "~7 min" }],
      notes: [
        "Video record yourself doing Ep. 3 FTL. Study yourself.",
        "Members of the paid program, submit your video for evaluation and feedback.",
      ],
    },
  },
  {
    day: 21,
    entry: {
      type: "rest",
      label: "Rest & Watch",
      videos: [
        { id: "-04s_fzgzrc", title: "10 Minute Tuesdays", duration: "~13 min" },
        { id: "jK5PFFhjcuc", title: "Popping Ice Bath", duration: "~7 min" },
        { id: "TBWN8eh-3ko", title: "Popping Choreography", duration: "~19 min" },
      ],
    },
  },
  {
    day: 22,
    entry: {
      type: "training",
      totalMin: "~36 min",
      videos: [
        { id: "cBox8Tqj8tk", title: "Ep.2 Drills", duration: "~13 min" },
        { id: "4ATqhNqInl8", title: "Ep.3 Drills", duration: "~16 min" },
        { id: "MOGEJQT2O4Y", title: "Ep.4 FTL", duration: "~7 min" },
      ],
    },
  },
  {
    day: 23,
    entry: {
      type: "training",
      totalMin: "~46 min",
      videos: [
        { id: "UoWvkNJ4fQA", title: "Balance Drills", duration: "~10 min" },
        { id: "4ATqhNqInl8", title: "Ep.3 Drills", duration: "~16 min" },
        { id: "pVTIeuVnCU8", title: "Ep.4 Drills", duration: "~20 min" },
      ],
    },
  },
  {
    day: 24,
    entry: {
      type: "training",
      totalMin: "~42 min",
      videos: [
        { id: "pVTIeuVnCU8", title: "Ep.4 Drills", duration: "~20 min" },
        { id: "88GptZde3b0", title: "Ep.5 Drills", duration: "~15 min" },
        { id: "MOGEJQT2O4Y", title: "Ep.4 FTL", duration: "~7 min" },
      ],
    },
  },
  {
    day: 25,
    entry: {
      type: "training",
      totalMin: "~47 min",
      videos: [
        { id: "W6bMPnm1JBU", title: "Chest Isolation Drills", duration: "~12 min" },
        { id: "pVTIeuVnCU8", title: "Ep.4 Drills", duration: "~20 min" },
        { id: "88GptZde3b0", title: "Ep.5 Drills", duration: "~15 min" },
      ],
    },
  },
  {
    day: 26,
    entry: {
      type: "training",
      totalMin: "~34 min",
      videos: [
        { id: "88GptZde3b0", title: "Ep.5 Drills", duration: "~15 min" },
        { id: "W6bMPnm1JBU", title: "Chest Isolation Drills", duration: "~12 min" },
        { id: "MOGEJQT2O4Y", title: "Ep.4 FTL", duration: "~7 min" },
      ],
    },
  },
  {
    day: 27,
    entry: {
      type: "review",
      videos: [{ id: "MOGEJQT2O4Y", title: "Ep.4 FTL", duration: "~7 min" }],
      notes: [
        "Video record yourself doing Ep. 4 FTL. Study yourself.",
        "Members of the paid program, submit your video for evaluation and feedback.",
      ],
    },
  },
  {
    day: 28,
    entry: {
      type: "rest",
      label: "Rest & Watch",
      videos: [
        { id: "7mkQW1yI7y8", title: "Popping Breakdown", duration: "~10 min" },
        { id: "zivBAs4Bti4", title: "Popping Breakdown", duration: "~13 min" },
        { id: "216uyJM5R98", title: "Popping Choreography", duration: "~20 min" },
      ],
    },
  },
  {
    day: 29,
    entry: {
      type: "review",
      videos: [
        { id: "woY92TNFZSc", title: "Ep.1 FTL", duration: "~5 min" },
        { id: "bhcDgwGLQHA", title: "Ep.2 FTL", duration: "~9 min" },
      ],
      notes: [
        "Review Episode 1 & 2 of FTL. Paid members resubmit for feedback and evaluation.",
      ],
    },
  },
  {
    day: 30,
    entry: {
      type: "review",
      videos: [
        { id: "wbefRONiS8c", title: "Ep.3 FTL", duration: "~7 min" },
        { id: "MOGEJQT2O4Y", title: "Ep.4 FTL", duration: "~7 min" },
      ],
      notes: [
        "Members of the paid program, submit your video for evaluation and feedback.",
      ],
    },
  },
];

const faqs = [
  {
    q: "How do I know if I'm doing it correctly?",
    a: "Serious learners can use the paid program for professional feedback from Ceech.",
  },
  {
    q: "How many videos am I supposed to do each day?",
    a: "Do ALL the videos listed for that day. More repetitions is always better.",
  },
  {
    q: "Must I follow them in a particular order?",
    a: "The order is recommended, but you can break up the videos throughout the day. Finishing in one session strengthens muscle memory the most.",
  },
  {
    q: "Is it possible to over train?",
    a: "Be careful with the leg pop — avoid hyperextending your knees. Otherwise, it's very difficult to over-train with popping.",
  },
  {
    q: "It's too hard! Any tips?",
    a: "Go at your own pace. Keep track of your progress. Building skills takes time — stay consistent.",
  },
  {
    q: "Can I take more rest days or change the schedule?",
    a: "Yes. Rest when your body needs it. The schedule is a guide, not a rule.",
  },
  {
    q: "What should I do after I finish the program?",
    a: "Depends on your goals. Some repeat the program, others move on. Ceech recommends taking at least one week off after completing.",
  },
];

function VideoCard({ video }: { video: VideoItem }) {
  const thumb = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
  const ytUrl = `https://www.youtube.com/watch?v=${video.id}`;
  return (
    <a
      href={ytUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 items-start group"
    >
      <div className="relative flex-shrink-0 w-28 rounded overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumb}
          alt={video.title}
          width={112}
          height={63}
          className="w-full h-auto object-cover group-hover:opacity-80 transition-opacity"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-7 h-7 rounded-full bg-black/70 flex items-center justify-center">
            <svg
              className="w-3 h-3 text-white ml-0.5"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-[#F9F9F9] group-hover:text-[#2563EB] transition-colors leading-snug">
          {video.title}
        </p>
        <p className="text-xs text-[#F9F9F9]/50 mt-0.5">{video.duration}</p>
      </div>
    </a>
  );
}

function DayCard({ day, entry }: { day: number; entry: DayEntry }) {
  const isReview = entry.type === "review";
  const isRest = entry.type === "rest";

  let badge = "";
  let badgeColor = "";
  if (isReview) {
    badge = "Review Day";
    badgeColor = "bg-[#FDB515]/20 text-[#FDB515]";
  } else if (isRest) {
    badge = (entry as { type: "rest"; label: string; videos: VideoItem[] }).label;
    badgeColor = "bg-white/10 text-[#F9F9F9]/60";
  } else {
    badge = (entry as { type: "training"; totalMin: string; videos: VideoItem[] }).totalMin;
    badgeColor = "bg-[#2563EB]/20 text-[#2563EB]";
  }

  return (
    <div className="bg-[#111111] rounded-xl border border-white/5 p-5">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl font-bold text-[#F9F9F9]/20 leading-none w-8 text-right">
          {day}
        </span>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeColor}`}
        >
          {badge}
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {entry.videos.map((v) => (
          <VideoCard key={v.id + v.title} video={v} />
        ))}
      </div>
      {(isReview || isRest) && "notes" in entry && entry.notes && (
        <ul className="mt-4 space-y-1.5">
          {entry.notes.map((note, i) => (
            <li key={i} className="text-sm text-[#F9F9F9]/60 flex gap-2">
              <span className="text-[#FDB515] mt-0.5">›</span>
              <span>{note}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function FTLPoppingPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#F9F9F9]">
      {/* Hero */}
      <section className="px-6 pt-20 pb-12 max-w-4xl mx-auto text-center">
        <p className="text-sm font-semibold tracking-widest uppercase text-[#FDB515] mb-4">
          30-Day Training Program
        </p>
        <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
          FTL Popping Training Series
          <br />
          <span className="text-[#2563EB]">Volume 1</span>
        </h1>
        <p className="text-lg text-[#F9F9F9]/70 max-w-xl mx-auto mb-8">
          This 30-day popping training program is designed for beginners to get
          started with popping. Follow the daily schedule and commit to the
          process.
        </p>
        <a
          href="http://youtube.com/nustudios"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
          Subscribe on YouTube
        </a>
      </section>

      {/* Schedule */}
      <section className="px-6 pb-16 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-8 text-center">
          The 30-Day Schedule
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {schedule.map(({ day, entry }) => (
            <DayCard key={day} day={day} entry={entry} />
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 pb-24 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold mb-8 text-center">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="bg-[#111111] border border-white/5 rounded-xl p-6"
            >
              <p className="font-semibold text-[#F9F9F9] mb-2">{faq.q}</p>
              <p className="text-[#F9F9F9]/65 text-sm leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
