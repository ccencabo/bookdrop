import type { Metadata } from 'next';
import Link from 'next/link';
import BrandMark from '../brand-mark';
import { getFacebookPageUrl } from '../../lib/public-config';

export const metadata:Metadata={
  title:'Privacy | The Second Chapter',
  description:'How The Second Chapter handles buyer information submitted with book claims.',
};

export default function PrivacyPage() {
  const facebookPageUrl=getFacebookPageUrl();
  return <main className="privacy-page">
    <header className="site-header"><Link className="brand" href="/" aria-label="The Second Chapter home"><BrandMark/><span>The Second Chapter</span></Link><nav><Link href="/">Latest drop</Link><Link href="/all-books">All books</Link><Link href="/updates">Updates</Link></nav></header>
    <section className="privacy-hero"><p className="eyebrow">Your information</p><h1>Privacy notice.</h1><p>Last updated September 26, 2026</p></section>
    <article className="privacy-content">
      <section><h2>Information we collect</h2><p>When you submit a claim, we collect your name, mobile number, Facebook profile or Messenger name, delivery method, delivery address when needed, order notes, claimed books, and order status.</p></section>
      <section><h2>How we use it</h2><p>We use this information only to manage the miner queue, contact you about your claim, collect payment, arrange delivery or pickup, provide order tracking, prevent abuse, and maintain necessary sales records.</p></section>
      <section><h2>Where it is stored</h2><p>Claim and inventory data is stored with Supabase, our database and authentication provider. Hosting and delivery providers may process limited technical information, such as IP addresses, to operate and protect the website.</p></section>
      <section><h2>Retention and sharing</h2><p>We keep information only as long as reasonably needed to complete orders, handle disputes, maintain required business records, and protect the service. We do not sell buyer information. We share it only with service providers or delivery partners when needed to complete an order, or when required by law.</p></section>
      <section><h2>Your choices</h2><p>You may ask to review, correct, or delete your information, subject to records we must retain for legal or legitimate business reasons.</p>{facebookPageUrl?<a className="privacy-contact" href={facebookPageUrl} target="_blank" rel="noreferrer">Contact The Second Chapter on Facebook ↗</a>:<p>Contact The Second Chapter through the same Facebook or Messenger account used to arrange your order.</p>}</section>
      <Link className="secondary-button" href="/">Back to the bookstore <span aria-hidden="true">→</span></Link>
    </article>
    <footer><div className="brand"><BrandMark/><span>The Second Chapter</span></div><nav><Link href="/">Latest drop</Link><Link href="/privacy">Privacy</Link></nav><p>Every book deserves another chapter.</p></footer>
  </main>;
}
