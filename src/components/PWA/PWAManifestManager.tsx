import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * PWAManifestManager dynamically updates the manifest link in the document head
 * based on the current route. This allows users to install specific modules
 * as standalone PWA applications with their own names and start URLs.
 */
export const PWAManifestManager: React.FC = () => {
    const location = useLocation();

    useEffect(() => {
        const updateManifest = () => {
            const path = location.pathname;
            let manifestFile = '/manifest.webmanifest'; // Default manifest from VitePWA

            if (path.startsWith('/gate-in')) {
                manifestFile = '/manifest-gate-in.webmanifest';
            } else if (path.startsWith('/gate-out')) {
                manifestFile = '/manifest-gate-out.webmanifest';
            } else if (path.startsWith('/booking')) {
                manifestFile = '/manifest-booking.webmanifest';
            }

            // Find or create the manifest link tag
            let link: HTMLLinkElement | null = document.querySelector('link[rel="manifest"]');

            if (!link) {
                link = document.createElement('link');
                link.rel = 'manifest';
                document.head.appendChild(link);
            }

            // Only update if the href has changed
            const currentHref = link.getAttribute('href');
            const newHref = manifestFile;

            if (currentHref !== newHref) {
                // Remove and re-add to force browser to re-fetch/re-evaluate
                link.remove();
                const newLink = document.createElement('link');
                newLink.rel = 'manifest';
                newLink.href = newHref;
                document.head.appendChild(newLink);
                console.log(`[PWA] Manifest updated to: ${newHref}`);
            }
        };

        updateManifest();
    }, [location.pathname]);

    return null;
};
