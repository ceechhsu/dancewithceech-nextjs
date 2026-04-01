'use client';

import { getYearsTeaching, getStudentCount } from '@/lib/stats';

export default function StatsBar() {
  const years = getYearsTeaching();
  const students = getStudentCount();

  const stats = [
    { stat: `${years}+`,                         label: 'Years Teaching' },
    { stat: `${students.toLocaleString()}+`,      label: 'Students Trained' },
    { stat: '8+',                                 label: 'Colleges Taught At' },
    { stat: '5',                                  label: 'Dance Styles' },
  ];

  return (
    <section className="py-12 px-6" style={{ borderTop: "1px solid #1f1f1f", borderBottom: "1px solid #1f1f1f" }}>
      <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-12 text-center">
        {stats.map(({ stat, label }) => (
          <div key={label}>
            <div className="text-3xl font-bold mb-1" style={{ color: "var(--accent-primary)" }}>{stat}</div>
            <div className="text-sm" style={{ color: "var(--muted)" }}>{label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
