import Storefront from './storefront';
import { listBooks } from '../db/store';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const books = await listBooks();
  return <Storefront initialBooks={books} />;
}
