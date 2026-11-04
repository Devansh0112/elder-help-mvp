import styles from './elder.module.css';

export function MayaAvatar({ speaking, resting }: { speaking: boolean; resting: boolean }) {
  return (
    <div
      className={styles.avatar}
      data-testid="maya-avatar"
      data-speaking={speaking ? 'true' : 'false'}
      data-resting={resting ? 'true' : 'false'}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static local SVG, no optimisation needed */}
      <img src="/maya.svg" alt="Maya, your helper" width={280} height={280} />
    </div>
  );
}
