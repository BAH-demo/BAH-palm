import { trpc } from '@/libs';

export default function useGetProviderOptions() {
  return trpc.settings.getProviderOptions.useQuery();
}
