import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title: 'CQL On-boarding System', description: 'Your business. Connected and ready to grow. A guided onboarding workspace by Core Quantum Leads.', icons: {icon:'/favicon.svg'}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}
