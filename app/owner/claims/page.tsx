import { redirect } from 'next/navigation';
import { getOwner } from '../../admin-auth';
import { listOrders } from '../../../lib/data';
import OwnerShell from '../owner-shell';
import ClaimsDashboard from './claims-dashboard';

export const dynamic = 'force-dynamic';

export default async function ClaimsPage() {
  const user=await getOwner();
  if(!user)redirect('/owner/login');
  const orders=await listOrders();
  return <OwnerShell email={user.email!} active="claims" eyebrow="Seller dashboard" title="Claims and miner queue."><ClaimsDashboard initialOrders={orders}/></OwnerShell>;
}
