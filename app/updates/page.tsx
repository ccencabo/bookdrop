import type { Metadata } from 'next';
import Link from 'next/link';
import { listSellerUpdates } from '../../lib/data';
import BrandMark from '../brand-mark';
import OrderTracker from './order-tracker';
import { getFacebookPageUrl } from '../../lib/public-config';

export const dynamic='force-dynamic';

export const metadata:Metadata={
  title:'Updates | The Second Chapter',
  description:'The latest announcements and shop updates from The Second Chapter.',
};

const updateDate=new Intl.DateTimeFormat('en-PH',{timeZone:'Asia/Manila',dateStyle:'long',timeStyle:'short'});

export default async function UpdatesPage() {
  const updates=await listSellerUpdates();
  const facebookPageUrl=getFacebookPageUrl();
  return <main className="updates-page">
    <header className="site-header"><Link className="brand" href="/" aria-label="The Second Chapter home"><BrandMark/><span>The Second Chapter</span></Link><nav><Link href="/#how">How it works</Link><Link href="/#collection">Latest drop</Link><Link href="/all-books">All books</Link><Link href="/updates">Updates</Link></nav><Link className="bag-button" href="/all-books#collection">Claim list <span>0</span></Link></header>
    <section className="updates-hero"><p className="eyebrow">From the seller</p><h1>Shop updates.</h1><p>New arrivals, announcements, and notes from The Second Chapter.</p></section>
    <OrderTracker/>
    <section className="public-updates" id="updates"><div className="section-heading"><div><p className="eyebrow">Latest news</p><h2>What’s happening</h2></div><p>{updates.length} {updates.length===1?'update':'updates'}</p></div>
      {updates.length?<div className="public-update-list">{updates.map((update)=><article className={update.image_url?'has-image':undefined} key={update.id}>{update.image_url&&<div className="public-update-image" role="img" aria-label={`Photo for ${update.title}`} style={{backgroundImage:`url("${update.image_url.replaceAll('"','%22')}")`}}/>}<div className="public-update-copy"><time dateTime={update.created_at}>{updateDate.format(new Date(update.created_at))}</time><h2>{update.title}</h2><p>{update.body}</p></div></article>)}</div>:<div className="empty-state">There are no shop updates yet. Check back soon.</div>}
    </section>
    <footer><div className="brand"><BrandMark/><span>The Second Chapter</span></div><nav><Link href="/">Latest drop</Link><Link href="/privacy">Privacy</Link>{facebookPageUrl&&<a href={facebookPageUrl} target="_blank" rel="noreferrer">Facebook</a>}</nav><p>Every book deserves another chapter.</p></footer>
  </main>;
}
