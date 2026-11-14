import { GitHubIcon } from './Icons';
import { GITHUB_URL } from './links';
import s from './landing.module.css';

export function Nav() {
  return (
    <header className={s.nav}>
      <div className={`${s.container} ${s.navInner}`}>
        <a href="#top" className={s.logo}>
          <span className={s.logoDot} aria-hidden="true" />
          Elder Help
        </a>
        <nav className={s.navLinks} aria-label="Sections">
          <a href="#how">How it works</a>
          <a href="#vision">Vision</a>
          <a href="#roadmap">Roadmap</a>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className={s.ghButton}>
            GitHub ↗
          </a>
        </nav>
      </div>
    </header>
  );
}

export function GitHubButton({ label, primary }: { label: string; primary?: boolean }) {
  return (
    <a
      href={GITHUB_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`${s.btn} ${primary ? s.btnPrimary : s.btnSecondary}`}
    >
      <GitHubIcon />
      {label}
    </a>
  );
}
