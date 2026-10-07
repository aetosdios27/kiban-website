import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="wordmark" aria-label="Kiban home">
          <span className="logo-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          kiban<span className="wordmark-dot">.</span>
        </Link>
        <nav aria-label="Main navigation" className="main-nav">
          <Link href="/explorer">
            Explorer <span aria-hidden="true">↗</span>
          </Link>
          <Link href="/#architecture">Architecture</Link>
          <Link href="/#benchmarks">Benchmarks</Link>
          <a href="https://github.com/aetosdios27/kiban">
            GitHub <span aria-hidden="true">↗</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
