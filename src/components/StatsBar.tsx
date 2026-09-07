export default function StatsBar() {
  const stats = [
    { stat: "1998",                         label: 'Teaching Since' },
    { stat: "6,000+",      label: 'Students Taught (Estimated)' },
    { stat: '8+',                                 label: 'Colleges Taught At' },
    { stat: '2010',                               label: "America's Got Talent, Season 5" },
  ];

  return (
    <section className="py-12 px-6" style={{ borderTop: "1px solid #1f1f1f", borderBottom: "1px solid #1f1f1f" }}>
      <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-y-8 gap-x-12 text-center">
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
