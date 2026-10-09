import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Editor from '@monaco-editor/react';
import {
  Activity, ArrowLeft, ArrowRight, Bell, BookOpen, Check, ChevronDown, CircleHelp,
  ClipboardList, Code2, FilePlus2, FlaskConical, Home,
  LoaderCircle, LogOut, Play, Plus, RefreshCw, Search, Send, Settings2, ShieldCheck,
  Sparkles, TerminalSquare, X,
} from 'lucide-react';
import { api, decodeToken, tokenKey } from './api';
import type { Assessment, ExecutionResult, Practical, SessionUser, Submission } from './types';
import './App.css';

type View = 'overview' | 'practicals' | 'assessments' | 'submissions';
type Workspace = { kind: 'practical'; item: Practical } | { kind: 'assessment'; item: Assessment };
type Notice = { tone: 'success' | 'error' | 'info'; text: string };
type Environment = { slug: string; name: string; language: string };
type QuestionDraft = {
  title: string;
  prompt: string;
  language: string;
  environment: string;
  time_limit_sec: string;
  memory_limit_mb: string;
  test_cases: Array<{ input: string; expected_output: string; points: string; is_hidden: boolean }>;
};

const starterCode = `#include <iostream>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> values(n);
    for (int& value : values) std::cin >> value;
    std::cout << "ready\\n";
    return 0;
}`;

function sessionFromToken(token: string): SessionUser | null {
  const payload = decodeToken(token);
  if (!payload.sub) return null;
  return {
    id: String(payload.sub),
    email: String(payload.email || ''),
    name: typeof payload.name === 'string' ? payload.name : undefined,
    role: String(payload.role || 'student'),
    batch_id: typeof payload.batch_id === 'string' ? payload.batch_id : null,
  };
}

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please retry.';
}

function formatDate(value?: string | null) {
  if (!value) return 'No due date';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'No due date' : new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function getMonacoLanguage(language?: string) {
  if (language?.toLowerCase().includes('python')) return 'python';
  if (language?.toLowerCase().includes('sql') || language?.toLowerCase().includes('postgres')) return 'sql';
  return 'cpp';
}

function App() {
  const [session, setSession] = useState<SessionUser | null>(() => {
    const token = localStorage.getItem(tokenKey);
    return token ? sessionFromToken(token) : null;
  });
  const [view, setView] = useState<View>('overview');
  const [practicals, setPracticals] = useState<Practical[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [gatewayOnline, setGatewayOnline] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [pageError, setPageError] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [query, setQuery] = useState('');
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [authoring, setAuthoring] = useState<'practical' | 'assessment' | null>(null);
  const [activeQuestionId, setActiveQuestionId] = useState('');
  const [code, setCode] = useState(starterCode);
  const [stdin, setStdin] = useState('');
  const [environment, setEnvironment] = useState('cpp-gcc');
  const [runResult, setRunResult] = useState<ExecutionResult | null>(null);
  const [currentSubmission, setCurrentSubmission] = useState<Submission | null>(null);

  const role = session?.role.toLowerCase() || 'student';
  const canAuthor = role === 'teacher' || role === 'admin' || role === 'institution_admin';

  const refreshWorkspace = useCallback(async () => {
    if (!session) return;
    setBusy(true);
    setPageError('');
    const results = await Promise.allSettled([
      api.health(),
      api.listPracticals(),
      api.listAssessments(),
      api.listSubmissions(role === 'student' ? session.id : undefined),
      api.environments(),
    ]);
    if (results[0].status === 'fulfilled') setGatewayOnline(true);
    else setGatewayOnline(false);
    if (results[1].status === 'fulfilled') setPracticals(results[1].value as Practical[]);
    else setPracticals([]);
    if (results[2].status === 'fulfilled') setAssessments(results[2].value as Assessment[]);
    else setAssessments([]);
    if (results[3].status === 'fulfilled') setSubmissions(results[3].value as Submission[]);
    else setSubmissions([]);
    if (results[4].status === 'fulfilled') setEnvironments(results[4].value.environments as Environment[]);
    else setEnvironments([]);
    const failed = results.find((result) => result.status === 'rejected');
    if (failed?.status === 'rejected') setPageError(messageFrom(failed.reason));
    setBusy(false);
  }, [role, session]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void refreshWorkspace();
    });
    return () => { active = false; };
  }, [refreshWorkspace]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function handleSession(token: string, data: Record<string, unknown>) {
    localStorage.setItem(tokenKey, token);
    const fromJwt = sessionFromToken(token);
    const next: SessionUser = {
      id: String(data.id || fromJwt?.id || ''),
      email: String(data.email || fromJwt?.email || ''),
      name: typeof data.name === 'string' ? data.name : fromJwt?.name,
      role: String(data.role || fromJwt?.role || 'student'),
      batch_id: typeof data.batch_id === 'string' ? data.batch_id : fromJwt?.batch_id,
    };
    setSession(next);
    setView('overview');
  }

  function logout() {
    localStorage.removeItem(tokenKey);
    setSession(null);
    setWorkspace(null);
    setSubmissions([]);
  }

  async function openPractical(practical: Practical) {
    setBusy(true);
    try {
      const full = await api.getPractical(practical.id) as Practical;
      setWorkspace({ kind: 'practical', item: full });
      setEnvironment(String(full.metadata?.environment || 'cpp-gcc'));
      setCode(starterCode);
      setStdin('');
      setRunResult(null);
      setCurrentSubmission(null);
      setPageError('');
    } catch (error) {
      setNotice({ tone: 'error', text: messageFrom(error) });
    } finally {
      setBusy(false);
    }
  }

  async function openAssessment(assessment: Assessment) {
    setBusy(true);
    try {
      const full = await api.getAssessment(assessment.id) as Assessment;
      const first = full.questions?.[0];
      setWorkspace({ kind: 'assessment', item: full });
      setActiveQuestionId(first?.id || '');
      setEnvironment(first?.environment || 'cpp-gcc');
      setCode(starterCode);
      setStdin('');
      setRunResult(null);
      setCurrentSubmission(null);
      setPageError('');
    } catch (error) {
      setNotice({ tone: 'error', text: messageFrom(error) });
    } finally {
      setBusy(false);
    }
  }

  function selectQuestion(questionId: string) {
    if (!workspace || workspace.kind !== 'assessment') return;
    const question = workspace.item.questions?.find((item) => item.id === questionId);
    setActiveQuestionId(questionId);
    setEnvironment(question?.environment || 'cpp-gcc');
    setCode(starterCode);
    setStdin('');
    setRunResult(null);
    setCurrentSubmission(null);
  }

  async function runCode() {
    if (!workspace || !session) return;
    setBusy(true);
    setRunResult(null);
    try {
      const request: Record<string, unknown> = {
        code,
        language: getMonacoLanguage(environment),
        environment,
        submitter_id: session.id,
        ...(stdin ? { stdin } : {}),
      };
      if (workspace.kind === 'assessment') {
        request.assessment_id = workspace.item.id;
        request.question_id = activeQuestionId;
      } else {
        request.practical_id = workspace.item.id;
      }
      const result = await api.run(request) as ExecutionResult;
      setRunResult(result);
      if (result.status === 'completed') setNotice({ tone: 'success', text: 'Run finished.' });
      else setNotice({ tone: 'error', text: result.error || result.status || 'Execution failed.' });
    } catch (error) {
      setNotice({ tone: 'error', text: messageFrom(error) });
    } finally {
      setBusy(false);
    }
  }

  async function submitCode() {
    if (!workspace || !session) return;
    setBusy(true);
    try {
      const metadata = { code, language: getMonacoLanguage(environment), environment, stdin };
      const request = workspace.kind === 'assessment'
        ? { submitter_id: session.id, assessment_id: workspace.item.id, question_id: activeQuestionId, metadata, attachments: [] }
        : { submitter_id: session.id, practical_id: workspace.item.id, metadata, attachments: [] };
      const saved = await api.submit(request) as Submission;
      setCurrentSubmission(saved);
      setNotice({ tone: 'success', text: workspace.kind === 'assessment' ? 'Answer submitted. Grading runs in the background.' : 'Practical submission saved.' });
      await refreshWorkspace();
    } catch (error) {
      setNotice({ tone: 'error', text: messageFrom(error) });
    } finally {
      setBusy(false);
    }
  }

  async function refreshSubmission() {
    if (!currentSubmission) return;
    try {
      const updated = await api.getSubmission(currentSubmission.id) as Submission;
      setCurrentSubmission(updated);
      setNotice({ tone: 'info', text: updated.graded ? 'Latest grade loaded.' : 'This submission is still waiting for grading.' });
      await refreshWorkspace();
    } catch (error) {
      setNotice({ tone: 'error', text: messageFrom(error) });
    }
  }

  async function saveCreated(kind: 'practical' | 'assessment') {
    setAuthoring(null);
    await refreshWorkspace();
    setView(kind === 'practical' ? 'practicals' : 'assessments');
    setNotice({ tone: 'success', text: `${kind === 'practical' ? 'Practical' : 'Assessment'} created.` });
  }

  if (!session) {
    return <LoginScreen onSession={handleSession} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark"><span /><span /><span /></div>
          <div><strong>FIELDLAB</strong><small>Practical workspace</small></div>
        </div>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Main navigation">
          <NavButton active={view === 'overview' && !workspace} icon={<Home size={17} />} label="Overview" onClick={() => { setWorkspace(null); setView('overview'); }} />
          <NavButton active={view === 'practicals' && !workspace} icon={<FlaskConical size={17} />} label="Practicals" count={practicals.length} onClick={() => { setWorkspace(null); setView('practicals'); }} />
          <NavButton active={view === 'assessments' && !workspace} icon={<ClipboardList size={17} />} label="Assessments" count={assessments.length} onClick={() => { setWorkspace(null); setView('assessments'); }} />
          <NavButton active={view === 'submissions' && !workspace} icon={<Code2 size={17} />} label="Submissions" onClick={() => { setWorkspace(null); setView('submissions'); }} />
        </nav>
        <div className="sidebar-spacer" />
        <div className="side-service">
          <div className={`service-dot ${gatewayOnline ? 'online' : gatewayOnline === false ? 'offline' : ''}`} />
          <div><strong>{gatewayOnline ? 'Gateway online' : gatewayOnline === false ? 'Gateway offline' : 'Checking gateway'}</strong><small>Service entry point</small></div>
          <button className="icon-button side-refresh" onClick={() => void refreshWorkspace()} title="Refresh services" aria-label="Refresh services"><RefreshCw size={14} /></button>
        </div>
        <div className="profile-chip">
          <div className="avatar">{(session.name || session.email || 'S').slice(0, 1).toUpperCase()}</div>
          <div className="profile-copy"><strong>{session.name || session.email.split('@')[0]}</strong><small>{role.replaceAll('_', ' ')}</small></div>
          <button className="icon-button" title="Sign out" aria-label="Sign out" onClick={logout}><LogOut size={15} /></button>
        </div>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-sep">/</span><strong>{workspace ? workspace.item.title : viewLabel(view)}</strong></div>
          <div className="topbar-actions">
            <label className="global-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your workspace" /><kbd>⌘ K</kbd></label>
            <span className="role-pill"><ShieldCheck size={13} /> {role}</span>
            <button className="icon-button notification-button" aria-label="Notifications"><Bell size={17} /><i /></button>
            {canAuthor && <div className="new-actions"><button className="button button-primary button-small" onClick={() => setAuthoring('practical')}><Plus size={15} /> New practical</button><button className="button button-quiet button-small" onClick={() => setAuthoring('assessment')}><FilePlus2 size={15} /> Assessment</button></div>}
          </div>
        </header>

        <div className="content-area">
          {pageError && <div className="inline-error"><CircleHelp size={16} /><span>{pageError}</span><button className="icon-button" aria-label="Dismiss error" onClick={() => setPageError('')}><X size={15} /></button></div>}
          {workspace ? (
            <Workbench
              workspace={workspace}
              activeQuestionId={activeQuestionId}
              onSelectQuestion={selectQuestion}
              code={code}
              onCodeChange={setCode}
              stdin={stdin}
              onStdinChange={setStdin}
              environment={environment}
              onEnvironmentChange={setEnvironment}
              environments={environments}
              result={runResult}
              submission={currentSubmission}
              busy={busy}
              onBack={() => setWorkspace(null)}
              onRun={() => void runCode()}
              onSubmit={() => void submitCode()}
              onRefreshSubmission={() => void refreshSubmission()}
            />
          ) : view === 'overview' ? (
            <Overview
              user={session}
              gatewayOnline={gatewayOnline}
              practicals={practicals}
              assessments={assessments}
              submissions={submissions}
              busy={busy}
              search={query}
              onRefresh={() => void refreshWorkspace()}
              onPractical={openPractical}
              onAssessment={openAssessment}
              onNavigate={setView}
            />
          ) : view === 'practicals' ? (
            <CatalogPage kind="practical" items={practicals} search={query} busy={busy} onOpen={openPractical} onCreate={canAuthor ? () => setAuthoring('practical') : undefined} />
          ) : view === 'assessments' ? (
            <CatalogPage kind="assessment" items={assessments} search={query} busy={busy} onOpen={openAssessment} onCreate={canAuthor ? () => setAuthoring('assessment') : undefined} />
          ) : (
            <SubmissionsPage items={submissions} busy={busy} onRefresh={() => void refreshWorkspace()} onOpen={async (item) => {
              try {
                const full = await api.getSubmission(item.id) as Submission;
                if (full.assessment_id) {
                  const assessment = await api.getAssessment(full.assessment_id) as Assessment;
                  setWorkspace({ kind: 'assessment', item: assessment });
                  setActiveQuestionId(full.question_id || assessment.questions?.[0]?.id || '');
                  setEnvironment(String(full.metadata?.environment || 'cpp-gcc'));
                } else if (full.practical_id) {
                  const practical = await api.getPractical(full.practical_id) as Practical;
                  setWorkspace({ kind: 'practical', item: practical });
                  setEnvironment(String(full.metadata?.environment || 'cpp-gcc'));
                }
                setCurrentSubmission(full);
                setCode(String(full.metadata?.code || starterCode));
              } catch (error) {
                setNotice({ tone: 'error', text: messageFrom(error) });
              }
            }} />
          )}
        </div>
        <footer className="app-footer"><span>FIELDLAB <i /> WORKSPACE</span><span>Sandboxed execution · PostgreSQL records · Redis events</span></footer>
      </main>
      {authoring && <AuthoringModal kind={authoring} environments={environments} onClose={() => setAuthoring(null)} onSaved={() => void saveCreated(authoring)} />}
      {notice && <div className={`toast toast-${notice.tone}`} role="status"><span className="toast-mark">{notice.tone === 'success' ? <Check size={15} /> : notice.tone === 'error' ? <X size={15} /> : <Activity size={15} />}</span>{notice.text}<button className="icon-button" aria-label="Dismiss message" onClick={() => setNotice(null)}><X size={14} /></button></div>}
    </div>
  );
}

function viewLabel(view: View) {
  return { overview: 'Overview', practicals: 'Practicals', assessments: 'Assessments', submissions: 'Submissions' }[view];
}

function NavButton({ active, icon, label, count, onClick }: { active: boolean; icon: React.ReactNode; label: string; count?: number; onClick: () => void }) {
  return <button className={`nav-button ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span>{count !== undefined && <small>{count}</small>}</button>;
}

function LoginScreen({ onSession }: { onSession: (token: string, user: Record<string, unknown>) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [batchId, setBatchId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = mode === 'login'
        ? await api.login({ email, password })
        : await api.register({ email, password, name, batch_id: batchId });
      onSession(result.token, result.user);
    } catch (requestError) {
      setError(messageFrom(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <section className="auth-art">
        <div className="auth-brand"><div className="brand-mark brand-mark-light"><span /><span /><span /></div><span>FIELDLAB</span></div>
        <div className="auth-art-copy"><p className="eyebrow">PRACTICAL MANAGEMENT SYSTEM</p><h1>Make every<br /><em>run count.</em></h1><p>A focused workspace for lab practice, assessment runs, and the results behind them.</p></div>
        <div className="auth-orbit"><span className="orbit-ring" /><span className="orbit-core"><Code2 size={26} /></span><span className="orbit-node node-a">{`{ }`}</span><span className="orbit-node node-b">01</span></div>
        <div className="auth-art-foot"><span>01 / EXECUTE</span><span>02 / REVIEW</span><span>03 / IMPROVE</span></div>
      </section>
      <section className="auth-panel">
        <div className="auth-panel-top"><span>LAB ACCESS <i /></span><span>LOCAL WORKSPACE</span></div>
        <form className="auth-form" onSubmit={(event) => void submit(event)}>
          <div className="eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'NEW STUDENT ACCOUNT'}</div>
          <h2>{mode === 'login' ? 'Sign in to your lab.' : 'Join your cohort.'}</h2>
          <p className="auth-subtitle">{mode === 'login' ? 'Pick up where your last experiment stopped.' : 'Registration requires the batch ID assigned by your institution.'}</p>
          {mode === 'register' && <Field label="Full name"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Avery Patel" required autoComplete="name" /></Field>}
          <Field label="Email address"><input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@college.edu" type="email" required autoComplete="email" /></Field>
          <Field label="Password"><input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" type="password" required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></Field>
          {mode === 'register' && <Field label="Batch ID"><input value={batchId} onChange={(event) => setBatchId(event.target.value)} placeholder="UUID from your institution" required /></Field>}
          {error && <div className="form-error">{error}</div>}
          <button className="button button-primary auth-submit" type="submit" disabled={busy}>{busy ? <LoaderCircle size={16} className="spin" /> : mode === 'login' ? <ArrowRight size={16} /> : <Plus size={16} />}{busy ? 'Connecting' : mode === 'login' ? 'Enter workspace' : 'Create account'}</button>
          <div className="auth-switch">{mode === 'login' ? 'New to this workspace?' : 'Already enrolled?'} <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></div>
        </form>
        <div className="auth-panel-foot"><span>Protected by institution access</span><span>FIELDLAB <b>© 2026</b></span></div>
      </section>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <label className="form-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function Overview({ user, gatewayOnline, practicals, assessments, submissions, busy, search, onRefresh, onPractical, onAssessment, onNavigate }: {
  user: SessionUser;
  gatewayOnline: boolean | null;
  practicals: Practical[];
  assessments: Assessment[];
  submissions: Submission[];
  busy: boolean;
  search: string;
  onRefresh: () => void;
  onPractical: (item: Practical) => void;
  onAssessment: (item: Assessment) => void;
  onNavigate: (view: View) => void;
}) {
  const needle = search.toLowerCase();
  const filteredPracticals = practicals.filter((item) => item.title.toLowerCase().includes(needle));
  const filteredAssessments = assessments.filter((item) => item.title.toLowerCase().includes(needle));
  const recent = [...submissions].sort((a, b) => Date.parse(b.created_at || '') - Date.parse(a.created_at || '')).slice(0, 4);
  const dueSoon = practicals.filter((item) => item.due_date).sort((a, b) => Date.parse(a.due_date || '') - Date.parse(b.due_date || '')).slice(0, 3);

  return (
    <div className="page-enter">
      <section className="welcome-row">
        <div><p className="eyebrow">TUESDAY, OCTOBER 07, 2026 <span className="eyebrow-dot" /> YOUR WORKSPACE</p><h1>Good to see you, {user.name?.split(' ')[0] || user.email.split('@')[0] || 'there'}.</h1><p className="lead">Ready to put the next idea through its paces?</p></div>
        <button className="button button-quiet" onClick={onRefresh} disabled={busy}><RefreshCw size={15} className={busy ? 'spin' : ''} /> Refresh data</button>
      </section>

      <section className="metric-strip" aria-label="Workspace overview">
        <Metric value={String(practicals.length).padStart(2, '0')} label="PRACTICALS" accent="lime" onClick={() => onNavigate('practicals')} />
        <Metric value={String(assessments.length).padStart(2, '0')} label="ASSESSMENTS" accent="coral" onClick={() => onNavigate('assessments')} />
        <Metric value={String(submissions.length).padStart(2, '0')} label="CURRENT SUBMISSIONS" accent="blue" onClick={() => onNavigate('submissions')} />
        <div className="metric-note"><span className="metric-note-icon"><Activity size={17} /></span><div><strong>{busy ? 'Syncing service data' : gatewayOnline ? 'API gateway online' : 'API gateway unavailable'}</strong><small>{busy ? 'Fetching your current catalog' : gatewayOnline ? 'Service health is reported separately' : 'Start the gateway to load activities'}</small></div></div>
      </section>

      <div className="dashboard-grid">
        <section className="dashboard-main">
          <div className="section-heading"><div><p className="eyebrow">PICK UP WHERE YOU LEFT OFF</p><h2>Available work</h2></div><span className="section-count">{filteredPracticals.length + filteredAssessments.length} ITEMS</span></div>
          <div className="work-feed">
            {filteredAssessments.slice(0, 3).map((item, index) => <ActivityRow key={item.id} kind="assessment" item={item} index={index} onClick={() => void onAssessment(item)} />)}
            {filteredPracticals.slice(0, 4).map((item, index) => <ActivityRow key={item.id} kind="practical" item={item} index={index + 3} onClick={() => void onPractical(item)} />)}
            {!filteredPracticals.length && !filteredAssessments.length && <EmptyState title="Nothing in the catalog yet" detail="Practical and assessment activities will appear here once available." icon={<BookOpen size={22} />} />}
          </div>
          <div className="section-footer"><button className="text-action" onClick={() => onNavigate('practicals')}>Browse all practicals <ArrowRight size={14} /></button><button className="text-action" onClick={() => onNavigate('assessments')}>View assessments <ArrowRight size={14} /></button></div>
        </section>
        <aside className="dashboard-rail">
          <section className="rail-section due-section"><div className="rail-heading"><span className="rail-mark coral-mark"><Activity size={14} /></span><div><p className="eyebrow">ON YOUR RADAR</p><h3>Practical deadlines</h3></div></div>
            {dueSoon.length ? dueSoon.map((item) => <button className="due-item" key={item.id} onClick={() => void onPractical(item)}><span className="due-date">{new Date(item.due_date!).toLocaleDateString('en', { month: 'short', day: '2-digit' })}</span><span className="due-copy"><strong>{item.title}</strong><small>{item.max_marks ? `${item.max_marks} marks` : 'Practical'} · {formatDate(item.due_date)}</small></span><ArrowRight size={14} /></button>) : <p className="muted-note">No upcoming practical deadlines.</p>}
          </section>
          <section className="rail-section recent-section"><div className="rail-heading"><span className="rail-mark lime-mark"><TerminalSquare size={14} /></span><div><p className="eyebrow">LATEST ACTIVITY</p><h3>Submissions</h3></div></div>
            {recent.length ? recent.map((item) => <button className="recent-item" key={item.id} onClick={() => onNavigate('submissions')}><span className={`status-mark ${item.graded ? 'status-done' : 'status-pending'}`} /><span><strong>{item.assessment_id ? 'Assessment answer' : 'Practical submission'}</strong><small>{formatDate(item.created_at)} · {item.status || 'pending'}</small></span>{item.score !== null && item.score !== undefined && <b>{Number(item.score).toFixed(0)}%</b>}</button>) : <p className="muted-note">Your submitted work will appear here.</p>}
            <button className="text-action rail-link" onClick={() => onNavigate('submissions')}>Open history <ArrowRight size={14} /></button>
          </section>
          <div className="tip-band"><Sparkles size={17} /><div><strong>Run before you submit</strong><p>Check output and testcase status in the workspace before saving your answer.</p></div></div>
        </aside>
      </div>
    </div>
  );
}

function Metric({ value, label, accent, onClick }: { value: string; label: string; accent: string; onClick: () => void }) {
  return <button className={`metric metric-${accent}`} onClick={onClick}><strong>{value}</strong><span>{label}</span><ArrowRight size={15} /></button>;
}

function ActivityRow({ kind, item, index, onClick }: { kind: 'practical' | 'assessment'; item: Practical | Assessment; index: number; onClick: () => void }) {
  const isAssessment = kind === 'assessment';
  const practical = item as Practical;
  return (
    <button className="activity-row" onClick={onClick} style={{ animationDelay: `${index * 45}ms` }}>
      <span className={`activity-icon ${isAssessment ? 'assessment-icon' : 'practical-icon'}`}>{isAssessment ? <ClipboardList size={18} /> : <FlaskConical size={18} />}</span>
      <span className="activity-main"><span className="activity-type">{isAssessment ? 'ASSESSMENT' : 'PRACTICAL'} <i /> {String(item.subject_id || 'SUBJECT')}</span><strong>{item.title}</strong><small>{item.description || (isAssessment ? `${(item as Assessment).questions?.length || 0} questions · Auto-graded` : 'Hands-on practical')}</small></span>
      <span className="activity-meta"><span>{isAssessment ? 'Question set' : practical.due_date ? `Due ${formatDate(practical.due_date)}` : `${practical.max_marks ?? 'Open'} marks`}</span><ArrowRight size={16} /></span>
    </button>
  );
}

function CatalogPage<T extends Practical | Assessment>({ kind, items, search, busy, onOpen, onCreate }: {
  kind: 'practical' | 'assessment';
  items: T[];
  search: string;
  busy: boolean;
  onOpen: (item: T) => void;
  onCreate?: () => void;
}) {
  const filtered = items.filter((item) => `${item.title} ${item.description || ''} ${item.subject_id}`.toLowerCase().includes(search.toLowerCase()));
  const isAssessment = kind === 'assessment';
  return (
    <div className="page-enter catalog-page">
      <div className="page-title-row"><div><p className="eyebrow">LEARNING CATALOG <span className="eyebrow-dot" /> {isAssessment ? 'AUTO-GRADED' : 'LAB WORK'}</p><h1>{isAssessment ? 'Assessments' : 'Practicals'}</h1><p className="lead">{isAssessment ? 'Question sets with stored test cases and automatic scoring.' : 'Hands-on activities for your lab subjects.'}</p></div>{onCreate && <button className="button button-primary" onClick={onCreate}><Plus size={16} /> Create {kind}</button>}</div>
      <div className="catalog-toolbar"><span>{filtered.length} {filtered.length === 1 ? 'item' : 'items'}</span><span className="catalog-sort"><Settings2 size={14} /> Recently added <ChevronDown size={14} /></span></div>
      <div className="catalog-list">
        {filtered.map((item, index) => <ActivityRow key={item.id} kind={kind} item={item} index={index} onClick={() => onOpen(item)} />)}
        {!filtered.length && <EmptyState title={search ? 'No matches found' : busy ? 'Loading catalog' : `No ${kind}s yet`} detail={search ? 'Try another title or subject.' : 'New activities will show up here when published.'} icon={isAssessment ? <ClipboardList size={22} /> : <FlaskConical size={22} />} />}
      </div>
    </div>
  );
}

function Workbench({ workspace, activeQuestionId, onSelectQuestion, code, onCodeChange, stdin, onStdinChange, environment, onEnvironmentChange, environments, result, submission, busy, onBack, onRun, onSubmit, onRefreshSubmission }: {
  workspace: Workspace;
  activeQuestionId: string;
  onSelectQuestion: (questionId: string) => void;
  code: string;
  onCodeChange: (value: string) => void;
  stdin: string;
  onStdinChange: (value: string) => void;
  environment: string;
  onEnvironmentChange: (value: string) => void;
  environments: Environment[];
  result: ExecutionResult | null;
  submission: Submission | null;
  busy: boolean;
  onBack: () => void;
  onRun: () => void;
  onSubmit: () => void;
  onRefreshSubmission: () => void;
}) {
  const assessment = workspace.kind === 'assessment' ? workspace.item : null;
  const question = assessment?.questions?.find((item) => item.id === activeQuestionId);
  const practical = workspace.kind === 'practical' ? workspace.item : null;
  const title = question?.title || practical?.title || assessment?.title || 'Workspace';
  const description = question?.prompt || practical?.description || assessment?.description || 'Open a question to start working.';
  const language = question?.language || practical?.language || 'cpp';
  const environmentOptions = environments.length ? environments : [{ slug: 'cpp-gcc', name: 'C++ GCC', language: 'cpp' }];

  return (
    <div className="page-enter workbench-page">
      <div className="workbench-heading"><button className="back-button" onClick={onBack}><ArrowLeft size={15} /> Back to catalog</button><span className="workspace-badge"><span className={workspace.kind === 'assessment' ? 'badge-assessment' : 'badge-practical'}>{workspace.kind}</span> {workspace.item.subject_id}</span></div>
      <div className="workbench-layout">
        <aside className="problem-panel">
          <div className="problem-top"><p className="eyebrow">{workspace.kind === 'assessment' ? 'ASSESSMENT QUESTION' : 'PRACTICAL BRIEF'}</p><span className="problem-number">{question ? String((question.position ?? 0) + 1).padStart(2, '0') : '01'}</span></div>
          <h1>{title}</h1>
          <p className="problem-prompt">{description}</p>
          {assessment?.questions?.length ? <div className="question-switcher"><p className="eyebrow">QUESTIONS <span>{assessment.questions.length}</span></p>{assessment.questions.map((item, index) => <button key={item.id} className={`question-choice ${item.id === activeQuestionId ? 'selected' : ''}`} onClick={() => onSelectQuestion(item.id)}><span className="question-index">{String(index + 1).padStart(2, '0')}</span><span>{item.title}</span>{item.id === activeQuestionId && <ArrowRight size={14} />}</button>)}</div> : <div className="brief-meta"><MetaLine label="DUE DATE" value={formatDate(practical?.due_date)} /><MetaLine label="MAX MARKS" value={practical?.max_marks ? String(practical.max_marks) : 'Not specified'} /></div>}
          <div className="constraints"><div><span>LANGUAGE</span><b>{language.toUpperCase()}</b></div><div><span>TIME LIMIT</span><b>{question?.time_limit_sec ? `${question.time_limit_sec}s` : 'Service default'}</b></div><div><span>MEMORY</span><b>{question?.memory_limit_mb ? `${question.memory_limit_mb} MB` : 'Service default'}</b></div></div>
          {question?.test_cases?.length ? <div className="sample-note"><div className="sample-label"><span className="sample-dot" /> VISIBLE EXAMPLES</div><p>{question.test_cases.length} visible test cases · hidden cases stay on the grading service</p></div> : null}
        </aside>
        <section className="editor-panel">
          <div className="editor-toolbar"><div className="editor-tabs"><span className="editor-tab-active"><Code2 size={14} /> solution.cpp</span><span className="editor-tab-muted">STDIN</span></div><div className="editor-settings"><label><span className="sr-only">Execution environment</span><select value={environment} onChange={(event) => onEnvironmentChange(event.target.value)}>{environmentOptions.map((option) => <option key={option.slug} value={option.slug}>{option.name || option.slug}</option>)}</select></label><span className="editor-status"><i /> Ready</span></div></div>
          <div className="editor-frame"><Editor height="365px" language={getMonacoLanguage(language)} theme="vs-dark" value={code} onChange={(value) => onCodeChange(value || '')} options={{ minimap: { enabled: false }, fontSize: 14, lineHeight: 22, fontFamily: 'IBM Plex Mono, monospace', scrollBeyondLastLine: false, automaticLayout: true, padding: { top: 18 }, roundedSelection: false, renderLineHighlight: 'gutter', tabSize: 4 }} /></div>
          <div className="stdin-row"><div className="stdin-label"><TerminalSquare size={14} /><span>STANDARD INPUT</span><small>optional</small></div><textarea value={stdin} onChange={(event) => onStdinChange(event.target.value)} placeholder="Enter stdin for a practical run…" rows={2} /></div>
          {result && <RunOutput result={result} />}
          {submission && <div className="submission-state"><span className={`state-pip ${submission.graded ? 'green-pip' : ''}`} /><div><strong>{submission.graded ? `Graded · ${Number(submission.score || 0).toFixed(1)}%` : `Submission ${submission.status || 'pending'}`}</strong><small>ID {submission.id}</small></div><button className="button button-quiet button-small" onClick={onRefreshSubmission}><RefreshCw size={13} /> Refresh</button></div>}
          <div className="editor-actions"><span className="sandbox-note"><ShieldCheck size={14} /> Runs in an isolated sandbox</span><div><button className="button button-dark" onClick={onRun} disabled={busy || !code.trim()}><Play size={15} fill="currentColor" /> {busy ? 'Running…' : 'Run code'}</button><button className="button button-primary" onClick={onSubmit} disabled={busy || !code.trim()}><Send size={15} /> {busy ? 'Working…' : 'Submit answer'}</button></div></div>
        </section>
      </div>
    </div>
  );
}

function MetaLine({ label, value }: { label: string; value: string }) {
  return <div className="meta-line"><span>{label}</span><strong>{value}</strong></div>;
}

function RunOutput({ result }: { result: ExecutionResult }) {
  return <div className="run-output"><div className="run-output-heading"><div><span className={`run-state-dot ${result.status === 'completed' ? 'success' : 'failure'}`} /><strong>{result.status || 'Execution result'}</strong><small>{result.execution_time_ms ?? 0} ms</small></div><span className="run-job">JOB {result.jobId || result.job_id || 'SYNC'}</span></div>
    {result.test_case_results?.length ? <div className="case-results">{result.test_case_results.map((item, index) => <div className="case-result" key={item.test_case_id}><span className={`case-icon ${item.status === 'completed' && item.exit_code === 0 ? 'case-pass' : 'case-fail'}`}>{item.status === 'completed' && item.exit_code === 0 ? <Check size={12} /> : <X size={12} />}</span><span>Case {String(index + 1).padStart(2, '0')}</span><code>{item.actual_output?.trim() || item.stderr || item.status}</code><small>{item.execution_time_ms ?? 0}ms</small></div>)}</div> : <pre className="console-output">{result.stdout || result.stderr || result.error || 'No output.'}</pre>}
  </div>;
}

function SubmissionsPage({ items, busy, onRefresh, onOpen }: { items: Submission[]; busy: boolean; onRefresh: () => void; onOpen: (item: Submission) => void }) {
  const sorted = [...items].sort((a, b) => Date.parse(b.created_at || '') - Date.parse(a.created_at || ''));
  return <div className="page-enter catalog-page"><div className="page-title-row"><div><p className="eyebrow">ATTEMPT LOG <span className="eyebrow-dot" /> LATEST FIRST</p><h1>Submissions</h1><p className="lead">Assessment rows hold the current question answer and grade. Practical attempts are stored separately.</p></div><button className="button button-quiet" onClick={onRefresh} disabled={busy}><RefreshCw size={15} className={busy ? 'spin' : ''} /> Refresh</button></div>
    <div className="submission-table-head"><span>ACTIVITY</span><span>SUBMITTED</span><span>STATUS</span><span>RESULT</span><span /></div>
    <div className="submission-list">{sorted.map((item) => <button className="submission-row" key={item.id} onClick={() => onOpen(item)}><span className="submission-activity"><i className={item.assessment_id ? 'submission-assessment' : 'submission-practical'}>{item.assessment_id ? <ClipboardList size={15} /> : <FlaskConical size={15} />}</i><span><strong>{item.assessment_id ? 'Assessment question' : 'Practical attempt'}</strong><small>{item.question_id ? `Question ${item.question_id.slice(0, 8)}` : `Practical ${item.practical_id?.slice(0, 8)}`}</small></span></span><span className="submission-date">{formatDate(item.created_at)}</span><span className="submission-status"><i className={item.graded ? 'state-pip green-pip' : 'state-pip'} />{item.graded ? 'Graded' : item.status || 'Pending'}</span><span className="submission-score">{item.graded && item.score !== null && item.score !== undefined ? `${Number(item.score).toFixed(0)}%` : '—'}</span><ArrowRight size={15} /></button>)}{!sorted.length && <EmptyState title="No submissions yet" detail="Run an activity, then submit your code to see its status here." icon={<Code2 size={22} />} />}</div>
  </div>;
}

function AuthoringModal({ kind, environments, onClose, onSaved }: { kind: 'practical' | 'assessment'; environments: Environment[]; onClose: () => void; onSaved: () => void }) {
  const [activeTab, setActiveTab] = useState(kind);
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [institutionId, setInstitutionId] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEnvironment, setSelectedEnvironment] = useState('cpp-gcc');
  const [dueDate, setDueDate] = useState('');
  const [maxMarks, setMaxMarks] = useState('100');
  const [questions, setQuestions] = useState<QuestionDraft[]>([newQuestionDraft()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function updateQuestion(index: number, patch: Partial<QuestionDraft>) {
    setQuestions((current) => current.map((question, questionIndex) => questionIndex === index ? { ...question, ...patch } : question));
  }

  function addQuestion() {
    setQuestions((current) => [...current, newQuestionDraft()]);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (activeTab === 'practical') {
        await api.createPractical({
          title,
          institution_id: institutionId,
          subject_id: subjectId,
          description,
          environment: selectedEnvironment,
          language: getMonacoLanguage(selectedEnvironment),
          max_marks: Number(maxMarks) || null,
          due_date: dueDate ? new Date(`${dueDate}T23:59:00`).toISOString() : null,
          metadata: { environment: selectedEnvironment },
        });
      } else {
        const questionIds: string[] = [];
        for (const question of questions) {
          const created = await api.createQuestion({
            title: question.title,
            prompt: question.prompt,
            language: question.language,
            environment: question.environment,
            time_limit_sec: Number(question.time_limit_sec) || 5,
            memory_limit_mb: Number(question.memory_limit_mb) || 256,
            test_cases: question.test_cases.map((testCase) => ({
              input: testCase.input,
              expected_output: testCase.expected_output,
              points: Number(testCase.points) || 1,
              is_hidden: testCase.is_hidden,
            })),
          });
          questionIds.push(String(created.id));
        }
        await api.createAssessment({ title, subject_id: subjectId, description, metadata: {}, resources: [], question_ids: questionIds });
      }
      onSaved();
    } catch (requestError) {
      setError(messageFrom(requestError));
    } finally {
      setBusy(false);
    }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="author-modal" role="dialog" aria-modal="true" aria-labelledby="author-title"><header className="modal-header"><div><p className="eyebrow">AUTHORING DESK</p><h2 id="author-title">Create activity</h2></div><button className="icon-button" onClick={onClose} aria-label="Close authoring"><X size={18} /></button></header>
    <div className="author-tabs"><button className={activeTab === 'practical' ? 'selected' : ''} onClick={() => setActiveTab('practical')}><FlaskConical size={15} /> Practical</button><button className={activeTab === 'assessment' ? 'selected' : ''} onClick={() => setActiveTab('assessment')}><ClipboardList size={15} /> Assessment</button></div>
    <form className="author-form" onSubmit={(event) => void save(event)}><div className="author-grid"><Field label="Activity title"><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={activeTab === 'assessment' ? 'DSA fundamentals' : 'Array operations lab'} required /></Field><Field label="Subject ID or code"><input value={subjectId} onChange={(event) => setSubjectId(event.target.value)} placeholder="Subject UUID or code" required /></Field>
      {activeTab === 'practical' && <Field label="Institution ID or code"><input value={institutionId} onChange={(event) => setInstitutionId(event.target.value)} placeholder="Institution UUID or code" required /></Field>}
      <Field label="Execution environment"><select value={selectedEnvironment} onChange={(event) => setSelectedEnvironment(event.target.value)}>{(environments.length ? environments : [{ slug: 'cpp-gcc', name: 'C++ GCC', language: 'cpp' }]).map((item) => <option value={item.slug} key={item.slug}>{item.name || item.slug}</option>)}</select></Field>
      {activeTab === 'practical' && <><Field label="Maximum marks"><input type="number" min="1" value={maxMarks} onChange={(event) => setMaxMarks(event.target.value)} /></Field><Field label="Due date"><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></Field></>}
    </div><Field label="Description"><textarea className="author-description" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What should the learner accomplish?" /></Field>
    {activeTab === 'assessment' && <div className="question-drafts"><div className="question-drafts-heading"><div><p className="eyebrow">QUESTION BANK</p><strong>{questions.length} question{questions.length === 1 ? '' : 's'} to create</strong></div><button type="button" className="button button-quiet button-small" onClick={addQuestion}><Plus size={14} /> Add question</button></div>{questions.map((question, index) => <QuestionDraftForm key={index} question={question} index={index} environments={environments} onChange={(patch) => updateQuestion(index, patch)} onRemove={() => setQuestions((current) => current.filter((_, i) => i !== index))} />)}</div>}
    {error && <div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary" disabled={busy || !title || !subjectId || (activeTab === 'practical' && !institutionId)}>{busy ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />}{busy ? 'Saving…' : activeTab === 'assessment' ? 'Create questions & assessment' : 'Create practical'}</button></div></form>
  </section></div>;
}

function newQuestionDraft(): QuestionDraft {
  return { title: '', prompt: '', language: 'cpp', environment: 'cpp-gcc', time_limit_sec: '5', memory_limit_mb: '256', test_cases: [{ input: '', expected_output: '', points: '1', is_hidden: false }] };
}

function QuestionDraftForm({ question, index, environments, onChange, onRemove }: { question: QuestionDraft; index: number; environments: Environment[]; onChange: (patch: Partial<QuestionDraft>) => void; onRemove: () => void }) {
  function updateTest(indexToUpdate: number, patch: Partial<QuestionDraft['test_cases'][number]>) {
    onChange({ test_cases: question.test_cases.map((test, testIndex) => testIndex === indexToUpdate ? { ...test, ...patch } : test) });
  }
  return <section className="question-draft"><header><span className="question-index">{String(index + 1).padStart(2, '0')}</span><strong>Question details</strong>{index > 0 && <button type="button" className="icon-button remove-question" onClick={onRemove} title="Remove question" aria-label="Remove question"><X size={15} /></button>}</header>
    <Field label="Title"><input value={question.title} onChange={(event) => onChange({ title: event.target.value })} placeholder="Two Sum" required /></Field>
    <Field label="Prompt"><textarea rows={2} value={question.prompt} onChange={(event) => onChange({ prompt: event.target.value })} placeholder="Describe the problem and input/output format" required /></Field>
    <div className="question-settings"><Field label="Environment"><select value={question.environment} onChange={(event) => onChange({ environment: event.target.value, language: getMonacoLanguage(event.target.value) })}>{(environments.length ? environments : [{ slug: 'cpp-gcc', name: 'C++ GCC', language: 'cpp' }]).map((item) => <option key={item.slug} value={item.slug}>{item.name || item.slug}</option>)}</select></Field><Field label="Time (sec)"><input type="number" min="1" value={question.time_limit_sec} onChange={(event) => onChange({ time_limit_sec: event.target.value })} /></Field><Field label="Memory (MB)"><input type="number" min="1" value={question.memory_limit_mb} onChange={(event) => onChange({ memory_limit_mb: event.target.value })} /></Field></div>
    <div className="draft-cases-head"><span>TEST CASES</span><button type="button" className="text-action" onClick={() => onChange({ test_cases: [...question.test_cases, { input: '', expected_output: '', points: '1', is_hidden: true }] })}><Plus size={13} /> Add case</button></div>
    {question.test_cases.map((testCase, caseIndex) => <div className="draft-case" key={caseIndex}><div className="draft-case-label"><span>CASE {String(caseIndex + 1).padStart(2, '0')}</span><label><input type="checkbox" checked={testCase.is_hidden} onChange={(event) => updateTest(caseIndex, { is_hidden: event.target.checked })} /> Hidden</label>{caseIndex > 0 && <button type="button" className="icon-button" onClick={() => onChange({ test_cases: question.test_cases.filter((_, i) => i !== caseIndex) })} aria-label="Remove testcase"><X size={13} /></button>}</div><div className="draft-case-grid"><Field label="Input"><textarea rows={2} value={testCase.input} onChange={(event) => updateTest(caseIndex, { input: event.target.value })} placeholder="stdin" /></Field><Field label="Expected output"><textarea rows={2} value={testCase.expected_output} onChange={(event) => updateTest(caseIndex, { expected_output: event.target.value })} placeholder="stdout" required /></Field><Field label="Points"><input type="number" min="0.01" step="0.01" value={testCase.points} onChange={(event) => updateTest(caseIndex, { points: event.target.value })} /></Field></div></div>)}
  </section>;
}

function EmptyState({ title, detail, icon }: { title: string; detail: string; icon: React.ReactNode }) {
  return <div className="empty-state"><span>{icon}</span><strong>{title}</strong><p>{detail}</p></div>;
}

export default App;