import Head from 'next/head';
import { useRouter } from 'next/router';
import Nav from '../components/Nav';
import BottomNav from '../components/BottomNav';
import TopBanner from '../components/TopBanner';
import '../styles/globals.css';
import '../styles/hinge.css';
import '../styles/admin.css';

const pagesWithBottomNav = ['/swipe', '/likes', '/chats', '/profile'];
const authPages = ['/login', '/register'];

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const showBottomNav = pagesWithBottomNav.includes(router.pathname);
  const isAuthPage = authPages.includes(router.pathname);
  const isHomePage = router.pathname === '/';

  return (
    <>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <title>Campus Dating - Study with Love</title>
      </Head>
      <div className="app-shell">
        {showBottomNav && <TopBanner />}
        {!showBottomNav && !isAuthPage && !isHomePage && <Nav />}
        <main className={`app-main ${showBottomNav ? 'with-bottom-nav with-top-banner' : ''}`}>
          <Component {...pageProps} />
        </main>
        {showBottomNav && <BottomNav />}
      </div>
    </>
  );
}
