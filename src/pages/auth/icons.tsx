export const GoogleIcon = () => (
  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

export const EmailIcon = () => (
  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 6 9-6" />
  </svg>
);

export const PasswordIcon = () => (
  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="10" width="16" height="11" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>
);

/** The SMT layers mark (from the official SMT logo). */
const SmtLayers = () => (
  <>
    <path fill="#F10000" d="M13.9162 24.5479L0.835205 32.0254L13.9162 39.5187L26.9536 32.0231L13.9162 24.5479Z" />
    <path fill="#F10000" d="M39.9435 39.5051L52.9697 32.0254L39.939 24.5479L26.9539 32.0231L39.9435 39.5051Z" />
    <path fill="#C11001" d="M26.9528 32.0225L13.9153 39.4908L26.9528 46.9387L39.9425 39.5045L26.9528 32.0225Z" />
    <path fill="#9C0017" d="M52.9695 46.9845L39.9433 39.5049L26.9538 46.9391L13.9253 39.4912L0.835205 46.9845L26.9538 61.8712L52.9695 46.9845Z" />
    <path fill="#E10000" d="M26.9538 2.12852L0.835205 17.0675L13.9162 24.5473L26.9538 17.0744L39.9388 24.5473L52.9695 17.0675L26.9538 2.12852Z" />
    <path fill="#FD0221" d="M26.9528 17.0752L13.9153 24.5481L26.9528 32.0233L39.9378 24.5481L26.9528 17.0752Z" />
  </>
);

/** The SMT logo for dark backgrounds: the layers mark and the white "SMT" wordmark. */
export const SmtLogo = ({ className = "" }: { className?: string }) => (
  <svg role="img" aria-label="SMT" viewBox="0 0 186 64" className={className}>
    <SmtLayers />
    <path fill="#FFFFFF" d="M61.6201 40.1619L69.7629 37.5223C71.0991 41.732 74.5617 44.7084 79.7282 44.7084C84.4678 44.7084 87.3845 43.1362 87.3845 40.7786C87.3845 38.4211 84.8331 37.5223 79.7282 36.2297L75.779 35.2194C67.152 32.9734 63.1413 29.2689 63.1413 23.0931C63.1413 16.3005 69.7034 11.5264 79.3628 11.5264C88.1131 11.5264 95.2829 15.6246 96.6786 23.2591L88.2936 25.2798C87.3822 21.07 83.8578 19.104 79.4222 19.104C74.9865 19.104 72.8006 20.508 72.8006 22.6402C72.8006 25.223 75.6558 26.1764 79.7876 27.1891L83.7986 28.1425C92.6699 30.2201 96.9229 34.0384 96.9229 40.1574C96.9229 47.4551 90.4223 52.2839 79.7282 52.2839C71.405 52.2839 63.9909 48.8591 61.6223 40.1574L61.6201 40.1619Z" />
    <path fill="#FFFFFF" d="M135.667 12.2598H144.66V51.5608H135.181V26.07L124.487 39.4322H122.906L112.153 26.07V51.5608H102.674V12.2598H111.666L123.818 27.5309L135.665 12.2598H135.667Z" />
    <path fill="#FFFFFF" d="M184.759 12.2598V19.9329H172.124V51.1764H162.739V19.9307H150.103V12.2598H184.759Z" />
  </svg>
);

/** The SMT layers mark alone, for the "Continue with SMT" button. */
export const SmtMark = ({ className = "" }: { className?: string }) => (
  <svg aria-hidden="true" viewBox="0 1 54 62" height="22" className={className}>
    <SmtLayers />
  </svg>
);
