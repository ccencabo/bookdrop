import type { Metadata } from 'next';
import { listBooks } from '../../lib/data';
import Storefront from '../storefront';
import { getFacebookPageUrl } from '../../lib/public-config';

export const dynamic = 'force-dynamic';

export const metadata:Metadata = {
  title:'All books | The Second Chapter',
  description:'Browse the complete book collection and current sale titles from The Second Chapter.',
};

export default async function AllBooksPage() {
  const books=await listBooks();
  return <Storefront initialBooks={books} nextPublishAt={null} view="all" facebookPageUrl={getFacebookPageUrl()} />;
}
