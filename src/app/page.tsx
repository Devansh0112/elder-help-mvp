import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.main}>
      <h1>Elder Help</h1>
      <p>Open each screen in its own tab.</p>
      <nav className={styles.links}>
        <Link href="/elder">Elder screen</Link>
        <Link href="/family">Family dashboard</Link>
      </nav>
    </main>
  );
}
