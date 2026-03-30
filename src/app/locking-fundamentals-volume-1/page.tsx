import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Locking Fundamentals Volume 1 | Dance With Ceech",
  description:
    "This 30-day locking fundamentals training program is designed for beginners to get started with locking. Master The Lock, The Wrist Twirl, The Point, and The Five.",
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
      totalMin: "~38 min",
      videos: [
        { id: "UBLvEcZK1mI", title: "Knee Isolation Drills", duration: "~10 min" },
        { id: "C0uR44Fh1L8", title: "Neck Isolation Drills", duration: "~7 min" },
        { id: "U_x-AxjcfNE", title: "The Lock", duration: "~21 min" },
      ],
    },
  },
  {
    day: 2,
    entry: {
      type: "training",
      totalMin: "~44 min",
      videos: [
        { id: "hlU10aJGdFE", title: "Shoulder Isolation Drills", duration: "~11 min" },
        { id: "eE2FZuaX1sc", title: "Pivoting Drills", duration: "~13 min" },
        { id: "U_x-AxjcfNE", title: "The Lock", duration: "~21 min" },
      ],
    },
  },
  {
    day: 3,
    entry: {
      type: "training",
      totalMin: "~38 min",
      videos: [
        { id: "UBLvEcZK1mI", title: "Knee Isolation Drills", duration: "~10 min" },
        { id: "C0uR44Fh1L8", title: "Neck Isolation Drills", duration: "~7 min" },
        { id: "U_x-AxjcfNE", title: "The Lock", duration: "~21 min" },
      ],
    },
  },
  {
    day: 4,
    entry: {
      type: "training",
      totalMin: "~44 min",
      videos: [
        { id: "hlU10aJGdFE", title: "Shoulder Isolation Drills", duration: "~11 min" },
        { id: "eE2FZuaX1sc", title: "Pivoting Drills", duration: "~13 min" },
        { id: "U_x-AxjcfNE", title: "The Lock", duration: "~21 min" },
      ],
    },
  },
  {
    day: 5,
    entry: {
      type: "training",
      totalMin: "~54 min",
      videos: [
        { id: "W6bMPnm1JBU", title: "Chest Isolation Drills", duration: "~12 min" },
        { id: "vrmvJVuOWhI", title: "Jumping Drills", duration: "~21 min" },
        { id: "U_x-AxjcfNE", title: "The Lock", duration: "~21 min" },
      ],
    },
  },
  {
    day: 6,
    entry: {
      type: "review",
      videos: [{ id: "U_x-AxjcfNE", title: "The Lock", duration: "~21 min" }],
      notes: [
        "Video record yourself doing all of the drills from The Lock. Study yourself.",
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
        { id: "PzvmozeNjWQ", title: "Locking Breakdown", duration: "~20 min" },
        { id: "LGMuzD5-QPQ", title: "Marching Dance Tutorial", duration: "~3 min" },
        { id: "YsNea3QHpCI", title: "Locking Tempo Drills", duration: "~2 min" },
      ],
    },
  },
  {
    day: 8,
    entry: {
      type: "training",
      totalMin: "~53 min",
      videos: [
        { id: "U_x-AxjcfNE", title: "The Lock", duration: "~21 min" },
        { id: "9rVsaOWrK9Q", title: "Wrist Twirl Part 1", duration: "~18 min" },
        { id: "5zV4dygvPTU", title: "Wrist Twirl Part 2", duration: "~14 min" },
      ],
    },
  },
  {
    day: 9,
    entry: {
      type: "training",
      totalMin: "~46 min",
      videos: [
        { id: "W6bMPnm1JBU", title: "Chest Isolation Drills", duration: "~12 min" },
        { id: "eE2FZuaX1sc", title: "Pivoting Drills", duration: "~13 min" },
        { id: "vrmvJVuOWhI", title: "Jumping Drills", duration: "~21 min" },
      ],
    },
  },
  {
    day: 10,
    entry: {
      type: "training",
      totalMin: "~53 min",
      videos: [
        { id: "U_x-AxjcfNE", title: "The Lock", duration: "~21 min" },
        { id: "9rVsaOWrK9Q", title: "Wrist Twirl Part 1", duration: "~18 min" },
        { id: "5zV4dygvPTU", title: "Wrist Twirl Part 2", duration: "~14 min" },
      ],
    },
  },
  {
    day: 11,
    entry: {
      type: "training",
      totalMin: "~46 min",
      videos: [
        { id: "W6bMPnm1JBU", title: "Chest Isolation Drills", duration: "~12 min" },
        { id: "eE2FZuaX1sc", title: "Pivoting Drills", duration: "~13 min" },
        { id: "vrmvJVuOWhI", title: "Jumping Drills", duration: "~21 min" },
      ],
    },
  },
  {
    day: 12,
    entry: {
      type: "training",
      totalMin: "~53 min",
      videos: [
        { id: "U_x-AxjcfNE", title: "The Lock", duration: "~21 min" },
        { id: "9rVsaOWrK9Q", title: "Wrist Twirl Part 1", duration: "~18 min" },
        { id: "5zV4dygvPTU", title: "Wrist Twirl Part 2", duration: "~14 min" },
      ],
    },
  },
  {
    day: 13,
    entry: {
      type: "review",
      videos: [{ id: "5zV4dygvPTU", title: "Wrist Twirl Part 2", duration: "~14 min" }],
      notes: [
        "Video record yourself doing all of the drills for Wrist Twirl 2. Study yourself.",
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
        { id: "PzvmozeNjWQ", title: "Locking Breakdown", duration: "~20 min" },
        { id: "LGMuzD5-QPQ", title: "Marching Dance Tutorial", duration: "~3 min" },
        { id: "YsNea3QHpCI", title: "Locking Tempo Drills", duration: "~2 min" },
      ],
    },
  },
  {
    day: 15,
    entry: {
      type: "training",
      totalMin: "~49 min",
      videos: [
        { id: "9rVsaOWrK9Q", title: "Wrist Twirl Part 1", duration: "~18 min" },
        { id: "5zV4dygvPTU", title: "Wrist Twirl Part 2", duration: "~14 min" },
        { id: "MIbHRFWpYQ4", title: "The Point", duration: "~17 min" },
      ],
    },
  },
  {
    day: 16,
    entry: {
      type: "training",
      totalMin: "~41 min",
      videos: [
        { id: "eE2FZuaX1sc", title: "Pivoting Drills", duration: "~13 min" },
        { id: "C0uR44Fh1L8", title: "Neck Isolation Drills", duration: "~7 min" },
        { id: "vrmvJVuOWhI", title: "Jumping Drills", duration: "~21 min" },
      ],
    },
  },
  {
    day: 17,
    entry: {
      type: "training",
      totalMin: "~49 min",
      videos: [
        { id: "9rVsaOWrK9Q", title: "Wrist Twirl Part 1", duration: "~18 min" },
        { id: "5zV4dygvPTU", title: "Wrist Twirl Part 2", duration: "~14 min" },
        { id: "MIbHRFWpYQ4", title: "The Point", duration: "~17 min" },
      ],
    },
  },
  {
    day: 18,
    entry: {
      type: "training",
      totalMin: "~41 min",
      videos: [
        { id: "eE2FZuaX1sc", title: "Pivoting Drills", duration: "~13 min" },
        { id: "C0uR44Fh1L8", title: "Neck Isolation Drills", duration: "~7 min" },
        { id: "vrmvJVuOWhI", title: "Jumping Drills", duration: "~21 min" },
      ],
    },
  },
  {
    day: 19,
    entry: {
      type: "training",
      totalMin: "~49 min",
      videos: [
        { id: "9rVsaOWrK9Q", title: "Wrist Twirl Part 1", duration: "~18 min" },
        { id: "5zV4dygvPTU", title: "Wrist Twirl Part 2", duration: "~14 min" },
        { id: "MIbHRFWpYQ4", title: "The Point", duration: "~17 min" },
      ],
    },
  },
  {
    day: 20,
    entry: {
      type: "review",
      videos: [{ id: "MIbHRFWpYQ4", title: "The Point", duration: "~17 min" }],
      notes: [
        "Video record yourself doing all of the drills for The Point. Study yourself.",
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
        { id: "PzvmozeNjWQ", title: "Locking Breakdown", duration: "~20 min" },
        { id: "LGMuzD5-QPQ", title: "Marching Dance Tutorial", duration: "~3 min" },
        { id: "YsNea3QHpCI", title: "Locking Tempo Drills", duration: "~2 min" },
      ],
    },
  },
  {
    day: 22,
    entry: {
      type: "training",
      totalMin: "~43 min",
      videos: [
        { id: "5zV4dygvPTU", title: "Wrist Twirl Part 2", duration: "~14 min" },
        { id: "MIbHRFWpYQ4", title: "The Point", duration: "~17 min" },
        { id: "z3KxLk6UuJY", title: "The Five", duration: "~12 min" },
      ],
    },
  },
  {
    day: 23,
    entry: {
      type: "training",
      totalMin: "~31 min",
      videos: [
        { id: "hlU10aJGdFE", title: "Shoulder Isolation Drills", duration: "~11 min" },
        { id: "UBLvEcZK1mI", title: "Knee Isolation Drills", duration: "~10 min" },
        { id: "UoWvkNJ4fQA", title: "Balance Drills", duration: "~10 min" },
      ],
    },
  },
  {
    day: 24,
    entry: {
      type: "training",
      totalMin: "~43 min",
      videos: [
        { id: "5zV4dygvPTU", title: "Wrist Twirl Part 2", duration: "~14 min" },
        { id: "MIbHRFWpYQ4", title: "The Point", duration: "~17 min" },
        { id: "z3KxLk6UuJY", title: "The Five", duration: "~12 min" },
      ],
    },
  },
  {
    day: 25,
    entry: {
      type: "training",
      totalMin: "~31 min",
      videos: [
        { id: "hlU10aJGdFE", title: "Shoulder Isolation Drills", duration: "~11 min" },
        { id: "UBLvEcZK1mI", title: "Knee Isolation Drills", duration: "~10 min" },
        { id: "UoWvkNJ4fQA", title: "Balance Drills", duration: "~10 min" },
      ],
    },
  },
  {
    day: 26,
    entry: {
      type: "training",
      totalMin: "~43 min",
      videos: [
        { id: "5zV4dygvPTU", title: "Wrist Twirl Part 2", duration: "~14 min" },
        { id: "MIbHRFWpYQ4", title: "The Point", duration: "~17 min" },
        { id: "z3KxLk6UuJY", title: "The Five", duration: "~12 min" },
      ],
    },
  },
  {
    day: 27,
    entry: {
      type: "review",
      videos: [{ id: "z3KxLk6UuJY", title: "The Five", duration: "~12 min" }],
      notes: [
        "Video record yourself doing all of the drills for The Point. Study yourself.",
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
        { id: "PzvmozeNjWQ", title: "Locking Breakdown", duration: "~20 min" },
        { id: "LGMuzD5-QPQ", title: "Marching Dance Tutorial", duration: "~3 min" },
        { id: "YsNea3QHpCI", title: "Locking Tempo Drills", duration: "~2 min" },
      ],
    },
  },
  {
    day: 29,
    entry: {
      type: "review",
      videos: [
        { id: "U_x-AxjcfNE", title: "The Lock", duration: "~21 min" },
        { id: "5zV4dygvPTU", title: "Wrist Twirl Part 2", duration: "~14 min" },
      ],
      notes: [
        "Video record yourself doing all of the drills for The Point. Study yourself.",
        "Members of the paid program, submit your video for evaluation and feedback.",
      ],
    },
  },
  {
    day: 30,
    entry: {
      type: "review",
      videos: [
        { id: "MIbHRFWpYQ4", title: "The Point", duration: "~17 min" },
        { id: "z3KxLk6UuJY", title: "The Five", duration: "~12 min" },
      ],
      notes: [
        "Video record yourself doing all of the drills for The Point. Study yourself.",
        "Members of the paid program, submit your video for evaluation and feedback.",
      ],
    },
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

export default function LockingFundamentalsPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#F9F9F9]">
      {/* Hero */}
      <section className="px-6 pt-20 pb-12 max-w-4xl mx-auto text-center">
        <p className="text-sm font-semibold tracking-widest uppercase text-[#FDB515] mb-4">
          30-Day Training Program
        </p>
        <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
          Locking Fundamentals
          <br />
          <span className="text-[#2563EB]">Volume 1</span>
        </h1>
        <p className="text-lg text-[#F9F9F9]/70 max-w-xl mx-auto mb-4">
          This 30-day locking fundamentals training program is designed for
          beginners to get started with locking. You will focus on mastering:
        </p>
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {["The Lock", "The Wrist Twirl", "The Point", "The Five"].map((move) => (
            <span
              key={move}
              className="bg-[#2563EB]/15 border border-[#2563EB]/30 text-[#2563EB] text-sm font-semibold px-3 py-1 rounded-full"
            >
              {move}
            </span>
          ))}
        </div>
        <a
          href="http://youtube.com/nustudios?sub_confirmation=1"
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
      <section className="px-6 pb-24 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-8 text-center">
          The 30-Day Schedule
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {schedule.map(({ day, entry }) => (
            <DayCard key={day} day={day} entry={entry} />
          ))}
        </div>
      </section>
    </main>
  );
}
