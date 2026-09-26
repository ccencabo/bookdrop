import { requireChatGPTUser, chatGPTSignOutPath } from '../chatgpt-auth';
import { listBooks, listOrders, ownerEmail } from '../../db/store';
import OwnerDashboard from './owner-dashboard';
import OwnerSetup from './owner-setup';

export const dynamic = 'force-dynamic';

export default async function OwnerPage() {
  const user = await requireChatGPTUser('/owner');
  const owner = await ownerEmail();
  if (!owner || owner !== user.email.toLowerCase()) return <OwnerSetup email={user.email} configured={Boolean(owner)} />;
  const [books,orders] = await Promise.all([listBooks(),listOrders()]);
  return <OwnerDashboard books={books} orders={orders} email={user.email} signOutPath={chatGPTSignOutPath('/')} />;
}
