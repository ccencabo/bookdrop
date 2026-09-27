import Storefront from './storefront';
import { getNextBookPublishAt, listBooks } from '../lib/data';
import { splitLatestBookDrop } from '../lib/book-drops';
import { getFacebookPageUrl } from '../lib/public-config';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [books,nextPublishAt] = await Promise.all([listBooks(),getNextBookPublishAt()]);
  const {latest}=splitLatestBookDrop(books);
  return <Storefront initialBooks={latest} nextPublishAt={nextPublishAt} view="latest" facebookPageUrl={getFacebookPageUrl()} />;
}
