import { redirect } from 'next/navigation';
import { getOwner } from '../../admin-auth';
import { listBooks } from '../../../lib/data';
import OwnerShell from '../owner-shell';
import InventoryDashboard from './inventory-dashboard';

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
  const user=await getOwner();
  if(!user)redirect('/owner/login');
  const books=await listBooks(true,true);
  return <OwnerShell email={user.email!} active="inventory" eyebrow="Seller dashboard" title="Manage your inventory."><InventoryDashboard initialBooks={books} currentTime={new Date().toISOString()}/></OwnerShell>;
}
