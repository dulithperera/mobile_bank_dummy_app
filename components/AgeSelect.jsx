'use client';

const AGE_CATEGORIES = ['18–30', '30–40', '40–50', '50–60', '60+'];

export default function AgeSelect({ onSelect }) {
  return (
    <div className="screen">
      <h1 className="title">Before we begin</h1>
      <p className="lede">Please select your age group to continue.</p>

      <div className="age-grid">
        {AGE_CATEGORIES.map(cat => (
          <button
            key={cat}
            className="age-btn"
            onClick={() => onSelect(cat)}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}
