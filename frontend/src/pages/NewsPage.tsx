import { useState, useEffect } from 'react';
import styles from './NewsPage.module.css';

interface NewsArticle {
  id: string;
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
  category: string;
}

const TRUSTED_SOURCES = [
  'WHO',
  'CDC',
  'NIH',
  'Mayo Clinic',
  'Johns Hopkins',
  'The Lancet',
  'NEJM',
  'BMJ',
] as const;

const CATEGORIES = ['All', 'Research', 'Public Health', 'Clinical', 'Policy', 'Technology'] as const;

// Curated medical news from trusted sources
const MEDICAL_NEWS: NewsArticle[] = [
  {
    id: '1',
    title: 'WHO Releases Updated Guidelines on Antimicrobial Resistance',
    description:
      'The World Health Organization has published new guidelines aimed at combating the growing threat of antimicrobial resistance globally. The recommendations focus on stewardship programs and surveillance improvements.',
    source: 'WHO',
    url: 'https://www.who.int',
    publishedAt: '2026-03-12',
    category: 'Public Health',
  },
  {
    id: '2',
    title: 'Breakthrough in mRNA Vaccine Technology for Cancer Treatment',
    description:
      'Researchers at the NIH have demonstrated promising results in Phase II clinical trials using personalized mRNA vaccines for melanoma treatment, showing a 44% reduction in recurrence rates.',
    source: 'NIH',
    url: 'https://www.nih.gov',
    publishedAt: '2026-03-11',
    category: 'Research',
  },
  {
    id: '3',
    title: 'CDC Updates Respiratory Virus Surveillance Dashboard',
    description:
      'The Centers for Disease Control has launched an enhanced real-time dashboard for tracking respiratory illnesses including influenza, COVID-19, and RSV across all 50 states.',
    source: 'CDC',
    url: 'https://www.cdc.gov',
    publishedAt: '2026-03-10',
    category: 'Public Health',
  },
  {
    id: '4',
    title: 'New NEJM Study: AI-Assisted Radiology Reduces Diagnostic Errors by 30%',
    description:
      'A landmark study published in the New England Journal of Medicine found that AI-assisted radiological analysis significantly reduces missed diagnoses in chest X-ray screenings.',
    source: 'NEJM',
    url: 'https://www.nejm.org',
    publishedAt: '2026-03-09',
    category: 'Technology',
  },
  {
    id: '5',
    title: 'Mayo Clinic Advances Precision Medicine with Genomic Data Integration',
    description:
      'Mayo Clinic researchers have developed a novel framework for integrating whole-genome sequencing data into routine clinical decision-making, paving the way for more personalized treatment plans.',
    source: 'Mayo Clinic',
    url: 'https://www.mayoclinic.org',
    publishedAt: '2026-03-08',
    category: 'Clinical',
  },
  {
    id: '6',
    title: 'The Lancet: Global Burden of Disease Study Highlights Mental Health Crisis',
    description:
      'The latest Global Burden of Disease report published in The Lancet reveals that depression and anxiety disorders have increased by 25% worldwide since the pandemic, urging governments to invest in mental healthcare.',
    source: 'The Lancet',
    url: 'https://www.thelancet.com',
    publishedAt: '2026-03-07',
    category: 'Research',
  },
  {
    id: '7',
    title: 'Johns Hopkins: Telemedicine Adoption Reaches Record Levels in 2026',
    description:
      'A Johns Hopkins study reports that telemedicine visits now account for 38% of all outpatient encounters in the United States, with patient satisfaction rates exceeding 90% across specialties.',
    source: 'Johns Hopkins',
    url: 'https://www.hopkinsmedicine.org',
    publishedAt: '2026-03-06',
    category: 'Technology',
  },
  {
    id: '8',
    title: 'BMJ Editorial: Reforming Clinical Trial Design for Rare Diseases',
    description:
      'A BMJ editorial advocates for adaptive trial designs and decentralized approaches to clinical trials, arguing that current regulatory frameworks disadvantage patients with rare diseases.',
    source: 'BMJ',
    url: 'https://www.bmj.com',
    publishedAt: '2026-03-05',
    category: 'Policy',
  },
  {
    id: '9',
    title: 'NIH Awards $200M for Alzheimer\'s Early Detection Research',
    description:
      'The National Institutes of Health has announced a major funding initiative to accelerate research into blood-based biomarkers for early Alzheimer\'s disease detection, aiming to enable diagnosis years before symptom onset.',
    source: 'NIH',
    url: 'https://www.nih.gov',
    publishedAt: '2026-03-04',
    category: 'Research',
  },
  {
    id: '10',
    title: 'WHO Declares Progress in Global Polio Eradication Campaign',
    description:
      'The World Health Organization has reported a 95% reduction in wild poliovirus cases compared to last year, bringing the world closer to the goal of complete polio eradication.',
    source: 'WHO',
    url: 'https://www.who.int',
    publishedAt: '2026-03-03',
    category: 'Public Health',
  },
  {
    id: '11',
    title: 'CDC Issues New Guidelines for Antibiotic Prescribing in Primary Care',
    description:
      'The CDC has released evidence-based guidelines to reduce unnecessary antibiotic prescriptions for common upper respiratory infections, aiming to slow antibiotic resistance development.',
    source: 'CDC',
    url: 'https://www.cdc.gov',
    publishedAt: '2026-03-02',
    category: 'Clinical',
  },
  {
    id: '12',
    title: 'NEJM Review: Advances in CAR-T Cell Therapy for Solid Tumors',
    description:
      'A comprehensive review in NEJM examines recent breakthroughs in engineering CAR-T cells to target solid tumors, including new strategies to overcome the immunosuppressive tumor microenvironment.',
    source: 'NEJM',
    url: 'https://www.nejm.org',
    publishedAt: '2026-03-01',
    category: 'Research',
  },
];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getSourceColor(source: string): string {
  const colors: Record<string, string> = {
    WHO: '#0093D5',
    CDC: '#075985',
    NIH: '#1D4ED8',
    'Mayo Clinic': '#0369A1',
    'Johns Hopkins': '#1E3A5F',
    'The Lancet': '#B91C1C',
    NEJM: '#991B1B',
    BMJ: '#166534',
  };
  return colors[source] || '#6B7280';
}

export default function NewsPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSource, setSelectedSource] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredNews, setFilteredNews] = useState(MEDICAL_NEWS);

  useEffect(() => {
    let results = MEDICAL_NEWS;

    if (selectedCategory !== 'All') {
      results = results.filter((a) => a.category === selectedCategory);
    }
    if (selectedSource !== 'All') {
      results = results.filter((a) => a.source === selectedSource);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.source.toLowerCase().includes(q),
      );
    }

    setFilteredNews(results);
  }, [selectedCategory, selectedSource, searchQuery]);

  return (
    <>
      {/* Page header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Medical News</h1>
          <p className={styles.subtitle}>
            Latest updates from trusted medical sources worldwide
          </p>
        </div>
      </div>

      {/* Trusted sources banner */}
      <div className={styles.sourcesBanner}>
        <span className={styles.sourcesLabel}>Trusted Sources:</span>
        <div className={styles.sourcesTags}>
          {TRUSTED_SOURCES.map((source) => (
            <span
              key={source}
              className={styles.sourceTag}
              style={{ borderColor: getSourceColor(source), color: getSourceColor(source) }}
            >
              {source}
            </span>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchWrapper}>
          <svg
            className={styles.searchIcon}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Search medical news..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterGroup}>
          <div className={styles.filterPills}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`${styles.pill} ${selectedCategory === cat ? styles.pillActive : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className={styles.sourceSelect}
          >
            <option value="All">All Sources</option>
            {TRUSTED_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* News grid */}
      {filteredNews.length === 0 ? (
        <div className={styles.emptyState}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
            <path d="M18 14h-8" />
            <path d="M15 18h-5" />
            <path d="M10 6h8v4h-8V6Z" />
          </svg>
          <p>No articles match your filters.</p>
          <button
            className={styles.resetBtn}
            onClick={() => {
              setSelectedCategory('All');
              setSelectedSource('All');
              setSearchQuery('');
            }}
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className={styles.newsGrid}>
          {filteredNews.map((article) => (
            <article key={article.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span
                  className={styles.cardSource}
                  style={{
                    background: getSourceColor(article.source),
                  }}
                >
                  {article.source}
                </span>
                <span className={styles.cardCategory}>{article.category}</span>
              </div>
              <h3 className={styles.cardTitle}>{article.title}</h3>
              <p className={styles.cardDesc}>{article.description}</p>
              <div className={styles.cardFooter}>
                <time className={styles.cardDate}>{formatDate(article.publishedAt)}</time>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.cardLink}
                >
                  Read more
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" x2="21" y1="14" y2="3" />
                  </svg>
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
