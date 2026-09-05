import { useState } from 'react';
import { ArrowRight, BadgeCheck, BriefcaseBusiness, Check, ChevronLeft, CircleUserRound, FileUp, House, MapPin, Users, Wallet } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { kycSteps } from '@/data/mockData';

export function WorkerOnboarding() {
  const { navigate, kycCompletedSteps, completeKycStep } = useAppStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const handleNext = () => {
    completeKycStep(kycSteps[currentStep].id);
    if (currentStep < kycSteps.length - 1) { setCurrentStep(currentStep + 1); }
    else { setSubmitted(true); }
  };

  if (submitted) {
    return (
      <main className="container page-main">
        <div className="success-panel">
          <span className="success-icon"><Check size={28} /></span>
          <h2>Registration Complete!</h2>
          <p>Your profile has been submitted for verification. You'll be notified once your KYC is approved and you can start receiving gigs.</p>
          <div className="kyc-progress-summary">
            {kycSteps.map((step, index) => (
              <div key={step.id} className="kyc-step-done">
                <CheckCircle2Inline /> <span>{step.title}</span>
              </div>
            ))}
          </div>
          <button className="primary-button" onClick={() => navigate('workerDashboard')}>Go to Dashboard <ArrowRight size={17} /></button>
        </div>
      </main>
    );
  }

  const step = kycSteps[currentStep];
  const progress = ((currentStep + 1) / kycSteps.length) * 100;

  return (
    <main className="container register-page">
      <button className="text-button back-link" onClick={() => navigate('home')}><ChevronLeft size={17} /> Back to Home</button>
      <div className="progress-head">
        <div><span className="eyebrow">Worker registration</span><h1>{step.title}</h1></div>
        <strong>Step {currentStep + 1} <small>of {kycSteps.length}</small></strong>
      </div>
      <div className="progress-bar"><span style={{ width: `${progress}%` }} /></div>

      <div className="kyc-steps-bar">
        {kycSteps.map((s, index) => (
          <button key={s.id} className={`kyc-step-pill ${index < currentStep ? 'done' : ''} ${index === currentStep ? 'current' : ''}`} onClick={() => index < currentStep && setCurrentStep(index)}>
            {index < currentStep ? <Check size={14} /> : index + 1}
            <span>{s.title}</span>
          </button>
        ))}
      </div>

      <section className="form-card">
        {currentStep === 0 && <PersonalIdentityForm />}
        {currentStep === 1 && <AddressForm />}
        {currentStep === 2 && <SkillForm />}
        {currentStep === 3 && <CooperativeForm />}
        {currentStep === 4 && <BankForm />}
      </section>

      <div className="register-actions">
        <button className="text-button" onClick={() => currentStep > 0 ? setCurrentStep(currentStep - 1) : navigate('home')}><ChevronLeft size={17} /> {currentStep > 0 ? 'Back' : 'Cancel'}</button>
        <button className="primary-button large" onClick={handleNext}>
          {currentStep === kycSteps.length - 1 ? 'Submit Registration' : 'Save & Continue'} <ArrowRight size={17} />
        </button>
      </div>
    </main>
  );
}

function CheckCircle2Inline() { return <Check size={16} />; }

function PersonalIdentityForm() {
  return (
    <div className="form-grid">
      <label className="wide">Full name<input placeholder="As per official document" /></label>
      <label>Date of birth<input type="date" /></label>
      <label>Gender<select><option>Select</option><option>Female</option><option>Male</option><option>Other</option></select></label>
      <label>Phone number<input placeholder="10-digit mobile number" /></label>
      <label>Email<input placeholder="Optional" /></label>
      <button className="upload-box wide"><FileUp size={23} /><strong>Upload profile photo</strong><small>JPG, PNG up to 5MB</small></button>
      <label className="wide">Aadhaar ID<input placeholder="Enter 12-digit Aadhaar number" /></label>
      <button className="outline-button wide"><FileUp size={17} /> Upload Aadhaar document</button>
    </div>
  );
}

function AddressForm() {
  return (
    <div className="form-grid">
      <label className="wide">Street address<input placeholder="House/Flat No., Street, Area" /></label>
      <label>State<select><option>Select state</option><option>Maharashtra</option><option>Delhi</option><option>Karnataka</option></select></label>
      <label>District<select><option>Select district</option></select></label>
      <label>City/Town<input /></label>
      <label>PIN code<input placeholder="6 digits" /></label>
      <button className="upload-box wide"><FileUp size={23} /><strong>Upload address proof</strong><small>Utility bill, rent agreement, etc.</small></button>
    </div>
  );
}

function SkillForm() {
  const skills = ['Electrical', 'Plumbing', 'Carpentry', 'Painting', 'Cleaning', 'Driving', 'Gardening', 'Caregiving', 'Cooking', 'Domestic Help'];
  return (
    <div>
      <div className="form-title"><span className="service-icon peach"><BriefcaseBusiness size={21} /></span><div><h2>Select your skills</h2><p>Choose all the services you can provide.</p></div></div>
      <div className="skill-select-grid">
        {skills.map((skill) => (
          <label key={skill} className="skill-checkbox"><input type="checkbox" /> <span>{skill}</span></label>
        ))}
      </div>
      <label className="wide form-label">Years of experience<input type="number" min="0" placeholder="e.g. 5" /></label>
      <label className="wide form-label">Hourly rate (₹)<input type="number" min="0" placeholder="e.g. 250" /></label>
      <button className="upload-box wide"><FileUp size={23} /><strong>Upload certifications (optional)</strong><small>PDF, JPG, PNG up to 10MB</small></button>
    </div>
  );
}

function CooperativeForm() {
  return (
    <div className="form-grid">
      <label className="wide">Cooperative name<input placeholder="Name of your local cooperative" /></label>
      <label>Membership type<select><option>Select type</option><option>Full Member</option><option>Associate</option><option>Not a member</option></select></label>
      <label>Membership ID<input placeholder="If applicable" /></label>
      <label>Date of joining<input type="date" /></label>
      <button className="outline-button wide"><FileUp size={17} /> Upload membership proof</button>
    </div>
  );
}

function BankForm() {
  return (
    <div className="form-grid">
      <label className="wide">Account holder name<input placeholder="As per bank record" /></label>
      <label>Bank name<input placeholder="e.g. State Bank of India" /></label>
      <label>Account number<input placeholder="Bank account number" /></label>
      <label>IFSC code<input placeholder="e.g. SBIN0001234" /></label>
      <label className="wide">UPI ID<input placeholder="e.g. yourname@upi" /></label>
      <button className="upload-box wide"><FileUp size={23} /><strong>Upload passbook/bank statement</strong><small>For payout verification</small></button>
    </div>
  );
}
