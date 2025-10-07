import { Text, Skeleton } from '@mantine/core';
import { ReactNode } from 'react';

import { type SkeletonEntry } from '@/features/chat/types/entry';
import Entry from '@/features/chat/components/entries/Entry';
import { UserAvatar } from '@/features/chat/components/entries/elements/Avatars';
import { MessageRole } from '@/features/chat/types/message';

type SkeletonEntryProps = Readonly<{
  entry: SkeletonEntry;
  deepResearchEnabled: boolean;
}>;

export default function SkeletonEntry({ entry, deepResearchEnabled }: SkeletonEntryProps) {
  let avatar: ReactNode | null = null;
  let role: MessageRole = MessageRole.Assistant;

  if (entry.role === MessageRole.User) {
    avatar = <UserAvatar />;
    role = MessageRole.User;
  }

  return (
    <Entry id={entry.id} avatar={avatar} role={role}>
      {deepResearchEnabled && (
        <>
          <Text size='lg' fw={600} c='blue.6' mb='xs'>
            Deep research in progress
          </Text>
          <Text size='sm' mb='md'>
            Searching the web, analyzing findings, and synthesizing results. This typically takes 2-10 minutes depending on the complexity of your question.
          </Text>
        </>
      )}
      <Skeleton height={8} radius='xl'/>
      <Skeleton height={8} mt={6} radius='xl'/>
      <Skeleton height={8} mt={6} width='70%' radius='xl'/>
    </Entry>
  );
}
