import './globals.css';
import ClientLayout from '../components/ClientLayout';

export const dynamic = 'force-static';
export const dynamicParams = false;

export const metadata = {
    title: 'Kalcon Invoice Merger',
    description: 'Merge client invoices with expense backup PDFs',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                <title>Kalcon Invoice Merger</title>
                <meta name="description" content="Merge client invoices with expense backup PDFs" />
            </head>
            <body className="bg-gray-50 text-gray-900">
                <ClientLayout>{children}</ClientLayout>
            </body>
        </html>
    );
}

