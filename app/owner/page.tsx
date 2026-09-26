import { redirect } from 'next/navigation';
import { getOwner } from '../admin-auth';
import { listBooks, listOrders } from '../../lib/data';
import OwnerDashboard from './owner-dashboard';

export const dynamic = 'force-dynamic';

export default async function OwnerPage() {
  const user = await getOwner();
  if (!user) redirect('/owner/login');
  const [books,orders] = await Promise.all([listBooks(),listOrders()]);
  return <OwnerDashboard books={books} orders={orders} email={user.email!} />;
}
