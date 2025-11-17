'use client';

import { MouseEvent, ReactNode } from 'react';
import { navigateToPage } from '../lib/router';

interface ElectronLinkProps {
    href: string;
    children: ReactNode;
    className?: string;
}

/**
 * Custom Link component that works in Electron packaged apps
 * Uses hard navigation to bypass RSC fetching
 */
export default function ElectronLink({ href, children, className }: ElectronLinkProps) {
    const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        navigateToPage(href);
    };

    return (
        <a href={href} onClick={handleClick} className={className}>
            {children}
        </a>
    );
}

