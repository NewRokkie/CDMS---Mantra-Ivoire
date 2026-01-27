import React, { useState, useRef, useEffect } from 'react';
import { Yard } from '../../../../types';
import { TabButton } from './TabButton';
import { OverviewTab } from './OverviewTab';
import { ContactTab } from './ContactTab';
import { StructureTab } from './StructureTab';
import { MetadataTab } from './MetadataTab';

const TABS = [
  { id: 'overview',  label: 'Overview' },
  { id: 'contact',   label: 'Contact & Address' },
  { id: 'structure', label: 'Yard Structure' },
  { id: 'metadata',  label: 'Metadata' },
] as const;

type TabID = typeof TABS[number]['id'];

export const ModalTabs: React.FC<{ depot: Yard }> = ({ depot }) => {
  const [active, setActive] = useState<TabID>('overview');
  const navRef  = useRef<HTMLDivElement>(null);
  const [barStyle, setBarStyle] = useState({});

  useEffect(() => {
    const nav   = navRef.current;
    if (!nav) return;
    const activeBtn = nav.querySelector(`[data-tab-id="${active}"]`) as HTMLElement;
    if (!activeBtn) return;

    setBarStyle({
      left:  activeBtn.offsetLeft,
      width: activeBtn.offsetWidth,
    });
  }, [active]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Onglets */}
      <nav ref={navRef} className="relative px-8 border-b border-gray-200">
        <div className="flex gap-6">
          {TABS.map((t) => (
            <TabButton
              key={t.id}
              id={t.id}
              label={t.label}
              active={active === t.id}
              onClick={() => setActive(t.id)}
            />
          ))}
        </div>
        {/* Barre active */}
        <div
          className="absolute bottom-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300"
          style={barStyle}
        />
      </nav>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto p-8 bg-white">
        {active === 'overview'  && <OverviewTab  depot={depot} />}
        {active === 'contact'   && <ContactTab   depot={depot} />}
        {active === 'structure' && <StructureTab depot={depot} />}
        {active === 'metadata'  && <MetadataTab  depot={depot} />}
      </div>
    </div>
  );
};
