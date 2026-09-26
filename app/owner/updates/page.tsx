import { redirect } from 'next/navigation';
import { listSellerUpdates } from '../../../lib/data';
import { getOwner } from '../../admin-auth';
import OwnerShell from '../owner-shell';
import UpdatesDashboard from './updates-dashboard';

export const dynamic='force-dynamic';

export default async function OwnerUpdatesPage() {
  const user=await getOwner();
  if(!user)redirect('/owner/login');
  const updates=await listSellerUpdates();
  return <OwnerShell email={user.email!} active="updates" eyebrow="Seller dashboard" title="Share shop updates."><UpdatesDashboard initialUpdates={updates}/></OwnerShell>;
}
