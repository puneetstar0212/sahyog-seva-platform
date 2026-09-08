import { useState } from 'react';
import { ArrowRight, Check, ChevronLeft, CircleUserRound, Eye, EyeOff, Lock, Mail, Phone, MapPin, User, Wrench } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/lib/supabase';

type Role = 'customer' | 'worker';

export function Auth() {
  const { authMode, setAuthMode, navigate, setPortal, setAuthLoading, setAuthError, authError } = useAppStore();
  const [role, setRole] = useState<Role>('customer');

  const [form, setForm] = useState({
    fullName: '', email: '', password: '', confirmPassword: '', phone: '', address: '',
    skills: '', experienceYears: '', hourlyRate: '', workingHours: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  // Distinguish between immediate session and email-confirmation-required flows
  const [awaitingEmailConfirm, setAwaitingEmailConfirm] = useState(false);

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = 'Full name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    else if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(form.password)) e.password = 'Use letters and numbers';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!form.phone.trim()) e.phone = 'Phone number is required';
    else if (!/^\d{10}$/.test(form.phone.replace(/\D/g, ''))) e.phone = 'Enter a 10-digit number';
    if (!form.address.trim()) e.address = 'Address is required';
    if (role === 'worker') {
      if (!form.skills.trim()) e.skills = 'Enter at least one skill';
      if (!form.experienceYears || Number(form.experienceYears) < 0) e.experienceYears = 'Enter years of experience';
      if (!form.workingHours.trim()) e.workingHours = 'Enter your working hours';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setAuthLoading(true);
    setAuthError(null);
    setAwaitingEmailConfirm(false);

    try {
      // ── Step 1: Sign up with Supabase Auth ────────────────────────────────
      // Pass metadata so handle_new_user() trigger sets the correct role and name.
      // NOTE: The trigger enforces that 'admin' cannot be set via this path.
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.fullName,
            // Only 'customer' or 'worker' — trigger blocks 'admin'
            role: role as 'customer' | 'worker',
          },
        },
      });

      if (error) {
        // Provide a clear error for duplicate email vs other failures
        if (error.message?.toLowerCase().includes('already registered') ||
            error.message?.toLowerCase().includes('already exists') ||
            error.status === 422) {
          throw new Error('An account with this email already exists. Please sign in instead.');
        }
        throw error;
      }

      if (!data.user) {
        throw new Error('Registration failed: no user was created. Please try again.');
      }

      // ── Step 2: Handle email confirmation case ────────────────────────────
      // If Supabase requires email confirmation, data.session will be null.
      // In this case we cannot write to the database (RLS requires an authenticated session).
      // The handle_new_user trigger has already created a profile row via SECURITY DEFINER.
      if (!data.session) {
        // Email confirmation is required — the trigger already set the role.
        // Worker profile will need to be created after email confirmation + login.
        // We inform the user and exit cleanly.
        setAwaitingEmailConfirm(true);
        setAuthLoading(false);
        return;
      }

      // ── Step 3: Upsert the full profile with all registration fields ──────
      // The trigger may have already created a minimal profile row.
      // We upsert to ensure phone, address, and the correct role are saved.
      // SECURITY: We never write role='admin' here.
      const safeRole: 'customer' | 'worker' = role === 'worker' ? 'worker' : 'customer';

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        email: form.email,
        full_name: form.fullName,
        phone: form.phone,
        address: form.address,
        role: safeRole,
      }, { onConflict: 'id' });

      if (profileError) {
        console.error('Profile upsert error:', profileError);
        throw new Error(`Profile setup failed: ${profileError.message}. Code: ${profileError.code}`);
      }

      // ── Step 4: Create worker profile (workers only) ──────────────────────
      if (role === 'worker') {
        const skillsArray = form.skills.split(',').map((s) => s.trim()).filter(Boolean);

        // Use UPSERT (onConflict: user_id) to safely handle:
        // - Fresh registrations (INSERT)
        // - Retry attempts where profile was created but worker_profile failed (UPDATE)
        // This prevents unique constraint errors on re-registration.
        const { error: workerError } = await supabase.from('worker_profiles').upsert({
          user_id: data.user.id,
          skills: skillsArray,
          experience_years: Number(form.experienceYears) || 0,
          hourly_rate: Number(form.hourlyRate) || 0,
          working_hours: form.workingHours,
          // Explicitly set pending — never trust client to set approved
          approval_status: 'pending',
        }, { onConflict: 'user_id' });

        if (workerError) {
          console.error('Worker profile upsert error:', workerError);
          // Provide the real error so it can be debugged — registration is NOT complete
          throw new Error(
            `Worker profile setup failed: ${workerError.message}` +
            (workerError.hint ? ` Hint: ${workerError.hint}` : '') +
            (workerError.code ? ` (Code: ${workerError.code})` : '')
          );
        }

        // Success for worker — show pending approval message
        setSuccess(true);
      } else {
        // Customer registration complete — go to client portal
        useAppStore.getState().setProfile({
          id: data.user.id,
          email: form.email,
          full_name: form.fullName,
          phone: form.phone,
          address: form.address,
          role: 'customer',
        });
        useAppStore.getState().setSession({ user: { id: data.user.id, email: form.email } });
        setPortal('client');
        navigate('home');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setAuthError(msg);
      console.error('Registration error:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async () => {
    const e: Record<string, string> = {};
    if (!form.email.trim()) e.email = 'Email is required';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setAuthLoading(true);
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      if (error) throw error;
      if (data.user) {
        const { data: profile, error: profileFetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profileFetchError) {
          console.error('Profile fetch error:', profileFetchError);
          throw new Error(`Could not load your account profile: ${profileFetchError.message}`);
        }

        // SECURITY: Do NOT silently create a customer profile if one is missing.
        // A missing profile indicates an incomplete registration or a data issue.
        // Creating one here could silently downgrade an intended worker/admin.
        if (!profile) {
          await supabase.auth.signOut();
          throw new Error(
            'Your account profile is incomplete. This can happen if you did not confirm your email. ' +
            'Please re-register or contact support.'
          );
        }

        useAppStore.getState().setProfile(profile as never);
        useAppStore.getState().setSession({ user: { id: data.user.id, email: data.user.email ?? '' } });

        if ((profile as { role: string }).role === 'admin') {
          setPortal('admin');
          navigate('adminDashboard');
        } else if ((profile as { role: string }).role === 'worker') {
          const { data: workerProfile } = await supabase
            .from('worker_profiles')
            .select('*')
            .eq('user_id', data.user.id)
            .maybeSingle();
          if (workerProfile) useAppStore.getState().setWorkerProfile(workerProfile as never);
          setPortal('worker');
          navigate('workerDashboard');
        } else {
          setPortal('client');
          navigate('home');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid email or password. Please try again.';
      setAuthError(msg);
      console.error('Login error:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  // ── Email confirmation pending state ──────────────────────────────────────
  if (awaitingEmailConfirm) {
    return (
      <main className="container page-main">
        <div className="success-panel" style={{ maxWidth: 520, margin: '0 auto' }}>
          <span className="success-icon"><Mail size={28} /></span>
          <h2>Check Your Email</h2>
          <p>
            We sent a confirmation link to <strong>{form.email}</strong>.
            Please open that email and click the link to verify your account.
            After confirming, come back and sign in.
          </p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
            {role === 'worker'
              ? 'Your worker profile will be set up when you sign in after confirming your email.'
              : ''}
          </p>
          <button className="primary-button" onClick={() => { setAwaitingEmailConfirm(false); setAuthMode('login'); }}>
            Go to Sign In <ArrowRight size={17} />
          </button>
        </div>
      </main>
    );
  }

  // ── Worker registration success (pending approval) ────────────────────────
  if (success) {
    return (
      <main className="container page-main">
        <div className="success-panel" style={{ maxWidth: 520, margin: '0 auto' }}>
          <span className="success-icon"><Check size={28} /></span>
          <h2>Registration Submitted!</h2>
          <p>Your worker profile has been created and is now <strong>pending admin approval</strong>. You will be able to access the worker dashboard once an administrator reviews and approves your account.</p>
          <button className="primary-button" onClick={() => { setPortal('worker'); navigate('workerDashboard'); }}>Go to Worker Dashboard <ArrowRight size={17} /></button>
        </div>
      </main>
    );
  }

  const isLogin = authMode === 'login';

  return (
    <main className="container page-main">
      <div className="auth-container">
        <button className="text-button back-link" onClick={() => navigate('home')}><ChevronLeft size={17} /> Back to Home</button>

        <div className="auth-card">
          <div className="auth-header">
            <span className="eyebrow">{isLogin ? 'Welcome back' : 'Create your account'}</span>
            <h1>{isLogin ? 'Sign in to Sahyog Seva' : 'Join Sahyog Seva'}</h1>
            <p>{isLogin ? 'Enter your credentials to access your account.' : 'Register as a customer or worker to get started.'}</p>
          </div>

          {!isLogin && (
            <div className="auth-role-toggle">
              <button className={role === 'customer' ? 'active' : ''} onClick={() => setRole('customer')}>
                <CircleUserRound size={18} /> Customer
              </button>
              <button className={role === 'worker' ? 'active' : ''} onClick={() => setRole('worker')}>
                <Wrench size={18} /> Worker
              </button>
            </div>
          )}

          <div className="auth-form">
            {!isLogin && (
              <label className="auth-field">
                <span>Full Name</span>
                <div className="input-with-icon">
                  <User size={17} />
                  <input value={form.fullName} onChange={(e) => update('fullName', e.target.value)} placeholder="Enter your full name" />
                </div>
                {errors.fullName && <small className="error-text">{errors.fullName}</small>}
              </label>
            )}

            <label className="auth-field">
              <span>Email</span>
              <div className="input-with-icon">
                <Mail size={17} />
                <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="you@example.com" />
              </div>
              {errors.email && <small className="error-text">{errors.email}</small>}
            </label>

            <label className="auth-field">
              <span>Password</span>
              <div className="input-with-icon">
                <Lock size={17} />
                <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="At least 8 characters" />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {errors.password && <small className="error-text">{errors.password}</small>}
            </label>

            {!isLogin && (
              <label className="auth-field">
                <span>Confirm Password</span>
                <div className="input-with-icon">
                  <Lock size={17} />
                  <input type={showPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} placeholder="Re-enter password" />
                </div>
                {errors.confirmPassword && <small className="error-text">{errors.confirmPassword}</small>}
              </label>
            )}

            {!isLogin && (
              <label className="auth-field">
                <span>Phone Number</span>
                <div className="input-with-icon">
                  <Phone size={17} />
                  <input value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="10-digit mobile number" maxLength={10} />
                </div>
                {errors.phone && <small className="error-text">{errors.phone}</small>}
              </label>
            )}

            {!isLogin && (
              <label className="auth-field">
                <span>Address</span>
                <div className="input-with-icon">
                  <MapPin size={17} />
                  <input value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="House/Flat, Street, Area, City" />
                </div>
                {errors.address && <small className="error-text">{errors.address}</small>}
              </label>
            )}

            {!isLogin && role === 'worker' && (
              <>
                <div className="auth-divider" />
                <label className="auth-field">
                  <span>Service Category / Skills</span>
                  <div className="input-with-icon">
                    <Wrench size={17} />
                    <input value={form.skills} onChange={(e) => update('skills', e.target.value)} placeholder="e.g. Electrical, Plumbing, Cleaning" />
                  </div>
                  {errors.skills && <small className="error-text">{errors.skills}</small>}
                </label>
                <div className="auth-field-row">
                  <label className="auth-field">
                    <span>Years of Experience</span>
                    <input type="number" min="0" value={form.experienceYears} onChange={(e) => update('experienceYears', e.target.value)} placeholder="e.g. 5" />
                    {errors.experienceYears && <small className="error-text">{errors.experienceYears}</small>}
                  </label>
                  <label className="auth-field">
                    <span>Hourly Rate (₹)</span>
                    <input type="number" min="0" value={form.hourlyRate} onChange={(e) => update('hourlyRate', e.target.value)} placeholder="e.g. 250" />
                  </label>
                </div>
                <label className="auth-field">
                  <span>Working Hours</span>
                  <input value={form.workingHours} onChange={(e) => update('workingHours', e.target.value)} placeholder="e.g. 9 AM – 6 PM, Mon–Sat" />
                  {errors.workingHours && <small className="error-text">{errors.workingHours}</small>}
                </label>
              </>
            )}

            {authError && <div className="auth-error-banner">{authError}</div>}

            <button className="primary-button large full" onClick={isLogin ? handleLogin : handleRegister} disabled={useAppStore.getState().authLoading}>
              {useAppStore.getState().authLoading ? 'Please wait…' : isLogin ? 'Sign In' : 'Create Account'} <ArrowRight size={17} />
            </button>

            <p className="auth-switch">
              {isLogin ? "Don't have an account? " : 'Already registered? '}
              <button onClick={() => { setAuthMode(isLogin ? 'register' : 'login'); setErrors({}); setAuthError(null); }}>
                {isLogin ? 'Register here' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
