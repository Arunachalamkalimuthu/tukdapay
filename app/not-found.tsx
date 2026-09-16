import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="page">
      <h1 style={{ fontSize: 34, fontWeight: 800 }}>That page isn&apos;t here</h1>
      <p className="muted" style={{ maxWidth: '42ch' }}>The link may be old or mistyped. The splitter is on the home page.</p>
      <Link className="btn btn-primary" href="/">Open the splitter</Link>
    </div>
  );
}
