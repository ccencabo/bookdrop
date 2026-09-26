import Storefront from './storefront';
import { listBooks } from '../lib/data';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const books = await listBooks();
  return <Storefront initialBooks={books} />;
}
