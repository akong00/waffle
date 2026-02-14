import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'] });

export const metadata = {
  title: 'Waffle Wednesday',
  description: 'Share a voice recording or text with your group each week.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="app-container">
          {children}
        </div>
      </body>
    </html>
  );
}
