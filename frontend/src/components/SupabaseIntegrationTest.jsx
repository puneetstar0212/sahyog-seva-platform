import { useState } from 'react';
import { supabase } from '../lib/supabase';

// ── Fictional test data ────────────────────────────────────────────────────────
const FICTION_EMAIL    = 'test_agent_99@sahyog-test.example.com';
const FICTION_PASSWORD = 'TestAgent@99!Secure';
const FICTION_GIG      = {
  title:       'Test Gig — Agent 99',
  description: 'Automated agent test data. Safe to delete.',
  budget:      999,
  status:      'Open',
};

// ── Tiny helpers ──────────────────────────────────────────────────────────────
const stamp = () => new Date().toLocaleTimeString();

const Badge = ({ ok, children }) => (
  <span
    style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: 9999,
      fontSize: 12,
      fontWeight: 700,
      background: ok ? '#dcfce7' : '#fee2e2',
      color:      ok ? '#166534' : '#991b1b',
    }}
  >
    {ok ? '✓' : '✗'} {children}
  </span>
);

const ResultBox = ({ result }) => {
  if (!result) return null;
  const ok = result.status === 'success';
  return (
    <div
      style={{
        marginTop: 10,
        padding: '10px 14px',
        borderRadius: 8,
        background: ok ? '#f0fdf4' : '#fef2f2',
        border: `1px solid ${ok ? '#86efac' : '#fca5a5'}`,
        fontSize: 13,
        lineHeight: 1.6,
      }}
    >
      <div style={{ marginBottom: 4 }}>
        <Badge ok={ok}>{ok ? 'SUCCESS' : 'ERROR'}</Badge>
        <span style={{ marginLeft: 8, color: '#6b7280', fontSize: 11 }}>
          {result.ts}
        </span>
      </div>
      <pre
        style={{
          margin: 0,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          color: ok ? '#15803d' : '#b91c1c',
          fontFamily: 'monospace',
          fontSize: 12,
        }}
      >
        {typeof result.payload === 'string'
          ? result.payload
          : JSON.stringify(result.payload, null, 2)}
      </pre>
    </div>
  );
};

// ── Section card ──────────────────────────────────────────────────────────────
const Section = ({ icon, title, description, color, onRun, loading, result }) => (
  <div
    style={{
      background: '#fff',
      borderRadius: 12,
      border: '1px solid #e5e7eb',
      padding: '18px 20px',
      boxShadow: '0 1px 4px rgba(0,0,0,.06)',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{title}</div>
        <div style={{ fontSize: 12, color: '#6b7280' }}>{description}</div>
      </div>
    </div>
    <button
      onClick={onRun}
      disabled={loading}
      style={{
        marginTop: 6,
        padding: '8px 18px',
        borderRadius: 8,
        border: 'none',
        cursor: loading ? 'not-allowed' : 'pointer',
        background: loading ? '#d1d5db' : color,
        color: '#fff',
        fontWeight: 600,
        fontSize: 13,
        transition: 'opacity .2s',
        opacity: loading ? 0.7 : 1,
      }}
    >
      {loading ? '⏳ Running…' : 'Run Test'}
    </button>
    <ResultBox result={result} />
  </div>
);

// ── Main component ─────────────────────────────────────────────────────────────
export default function SupabaseIntegrationTest() {
  const [loading, setLoading] = useState({});
  const [results, setResults] = useState({});
  const [createdGigId, setCreatedGigId] = useState(null);
  const [createdUserId, setCreatedUserId] = useState(null);

  const run = async (key, fn) => {
    setLoading(l => ({ ...l, [key]: true }));
    try {
      const payload = await fn();
      setResults(r => ({ ...r, [key]: { status: 'success', payload, ts: stamp() } }));
    } catch (err) {
      setResults(r => ({
        ...r,
        [key]: { status: 'error', payload: err?.message ?? String(err), ts: stamp() },
      }));
    } finally {
      setLoading(l => ({ ...l, [key]: false }));
    }
  };

  // ── 1. Auth Sign-Up ──────────────────────────────────────────────────────────
  const testAuth = () =>
    run('auth', async () => {
      const { data, error } = await supabase.auth.signUp({
        email:    FICTION_EMAIL,
        password: FICTION_PASSWORD,
      });
      if (error) throw error;
      if (data?.user) setCreatedUserId(data.user.id);
      return {
        user_id:          data?.user?.id,
        email:            data?.user?.email,
        confirmation_sent: data?.user?.confirmation_sent_at ?? 'n/a',
        message:          'Fictional user signed up successfully!',
      };
    });

  // ── 2. DB Write ──────────────────────────────────────────────────────────────
  const testWrite = () =>
    run('write', async () => {
      const { data, error } = await supabase
        .from('gigs')
        .insert([FICTION_GIG])
        .select()
        .single();
      if (error) throw error;
      setCreatedGigId(data.id);
      return { inserted_id: data.id, ...data };
    });

  // ── 3. DB Read ───────────────────────────────────────────────────────────────
  const testRead = () =>
    run('read', async () => {
      if (!createdGigId) throw new Error('Run the Write test first to get a gig ID.');
      const { data, error } = await supabase
        .from('gigs')
        .select('*')
        .eq('id', createdGigId)
        .single();
      if (error) throw error;
      return data;
    });

  // ── 4. Cleanup ───────────────────────────────────────────────────────────────
  const testCleanup = () =>
    run('cleanup', async () => {
      const report = {};

      // Delete gig
      if (createdGigId) {
        const { error } = await supabase.from('gigs').delete().eq('id', createdGigId);
        if (error) throw new Error(`Gig delete failed: ${error.message}`);
        report.gig = `Deleted gig ${createdGigId}`;
        setCreatedGigId(null);
      } else {
        report.gig = 'No gig ID tracked — skipped.';
      }

      // Sign out (can't hard-delete via anon key — sign out session)
      await supabase.auth.signOut();
      report.auth = createdUserId
        ? `Signed out fictional user ${createdUserId}`
        : 'No user session to clean up.';
      setCreatedUserId(null);

      return report;
    });

  const sections = [
    {
      key:         'auth',
      icon:        '🔐',
      color:       '#6366f1',
      title:       'Authentication Test',
      description: `Sign up ${FICTION_EMAIL} with a dummy password`,
      onRun:       testAuth,
    },
    {
      key:         'write',
      icon:        '✍️',
      color:       '#0ea5e9',
      title:       'Database Write Test',
      description: `Insert fictional gig → "${FICTION_GIG.title}"`,
      onRun:       testWrite,
    },
    {
      key:         'read',
      icon:        '📖',
      color:       '#10b981',
      title:       'Database Read Test',
      description: 'Fetch the newly inserted gig by its ID',
      onRun:       testRead,
    },
    {
      key:         'cleanup',
      icon:        '🧹',
      color:       '#f59e0b',
      title:       'Cleanup',
      description: 'Delete test gig & sign out fictional user',
      onRun:       testCleanup,
    },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f0f9ff 0%, #f8fafc 100%)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '40px 16px',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}
    >
      <div style={{ width: '100%', maxWidth: 540 }}>
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            borderRadius: 16,
            padding: '24px 28px',
            marginBottom: 20,
            color: '#fff',
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 4 }}>🧪</div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
            Supabase Integration Tests
          </h1>
          <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: 13 }}>
            Sahyog Seva · {import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0]}
          </p>
          {/* Live state chips */}
          <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, background: '#1e40af22', color: '#93c5fd', padding: '3px 10px', borderRadius: 999, border: '1px solid #1e40af55' }}>
              {createdUserId ? `👤 User: ${createdUserId.slice(0, 8)}…` : '👤 No user created'}
            </span>
            <span style={{ fontSize: 11, background: '#14532d22', color: '#86efac', padding: '3px 10px', borderRadius: 999, border: '1px solid #14532d55' }}>
              {createdGigId ? `📋 Gig: ${createdGigId.slice(0, 8)}…` : '📋 No gig created'}
            </span>
          </div>
        </div>

        {/* Test sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sections.map(s => (
            <Section
              key={s.key}
              {...s}
              loading={!!loading[s.key]}
              result={results[s.key]}
            />
          ))}
        </div>

        {/* Footer note */}
        <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 11, marginTop: 20 }}>
          All test data is fictional and cleaned up via the Cleanup button.
        </p>
      </div>
    </div>
  );
}
