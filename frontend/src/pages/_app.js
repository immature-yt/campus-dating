import Nav from '../components/Nav';

export default function App({ Component, pageProps }) {
  return (
    <div style={{ fontFamily: 'system-ui, Arial, sans-serif', maxWidth: 900, margin: '0 auto' }}>
      <Nav />
      <div style={{ padding: 16 }}>
        <Component {...pageProps} />
      </div>
    </div>
  );
}


