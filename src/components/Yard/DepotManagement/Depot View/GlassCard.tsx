import clsx from 'clsx';

export const GlassCard: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div
    className={clsx(
      'glass rounded-xl p-6 border',
      'bg-gradient-to-br from-white/5 to-white/10',
      className
    )}
  >
    {children}
  </div>
);
