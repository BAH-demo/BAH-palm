import { useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconTrash, IconUserPlus, IconUsers } from '@tabler/icons-react';

import { useChat } from '@/features/chat/providers/ChatProvider';
import useGetCollaborators from '@/features/chat/api/get-collaborators';
import useAddCollaborator from '@/features/chat/api/add-collaborator';
import useRemoveCollaborator from '@/features/chat/api/remove-collaborator';

export default function CollaboratorPanel() {
  const { chatId } = useChat();
  const { data, isPending } = useGetCollaborators(chatId);
  const addCollaborator = useAddCollaborator();
  const removeCollaborator = useRemoveCollaborator();

  const [newUserId, setNewUserId] = useState('');
  const [newRole, setNewRole] = useState<string>('Collaborator');

  const isOwner = data?.owner?.userId !== undefined;

  const handleAddCollaborator = async () => {
    if (!chatId || !newUserId.trim()) {
      return;
    }
    await addCollaborator.mutateAsync({
      chatId,
      userId: newUserId.trim(),
      role: newRole as 'Collaborator' | 'Viewer',
    });
    setNewUserId('');
  };

  const handleRemoveCollaborator = async (userId: string) => {
    if (!chatId) {
      return;
    }
    await removeCollaborator.mutateAsync({ chatId, userId });
  };

  if (isPending) {
    return (
      <Box p='md'>
        <Text size='sm' c='dimmed'>Loading collaborators...</Text>
      </Box>
    );
  }

  return (
    <Stack p='md' spacing='md'>
      <Group position='apart'>
        <Group spacing='xs'>
          <IconUsers size={20} />
          <Title order={5}>Collaborators</Title>
        </Group>
        {data?.collaborators && (
          <Badge variant='light' size='sm'>
            {data.collaborators.length + 1} members
          </Badge>
        )}
      </Group>

      {/* Owner */}
      {data?.owner && (
        <Box>
          <Group position='apart'>
            <Group spacing='xs'>
              <Text size='sm' fw={500}>{data.owner.email ?? data.owner.userId}</Text>
              <Badge size='xs' color='blue'>Owner</Badge>
            </Group>
          </Group>
        </Box>
      )}

      {/* Collaborators list */}
      {data?.collaborators?.map((collab) => (
        <Box key={collab.userId}>
          <Group position='apart'>
            <Group spacing='xs'>
              <Text size='sm'>{collab.email ?? collab.userId}</Text>
              <Badge size='xs' color={collab.role === 'Collaborator' ? 'green' : 'gray'}>
                {collab.role}
              </Badge>
            </Group>
            {isOwner && (
              <ActionIcon
                color='red'
                variant='subtle'
                size='sm'
                onClick={() => handleRemoveCollaborator(collab.userId)}
                loading={removeCollaborator.isPending}
              >
                <IconTrash size={14} />
              </ActionIcon>
            )}
          </Group>
        </Box>
      ))}

      {/* Add collaborator form (owner only) */}
      {isOwner && (
        <Box mt='sm'>
          <Text size='sm' fw={500} mb='xs'>Add Collaborator</Text>
          <Group spacing='xs' align='end'>
            <TextInput
              placeholder='User ID'
              value={newUserId}
              onChange={(e) => setNewUserId(e.currentTarget.value)}
              size='xs'
              style={{ flex: 1 }}
            />
            <Select
              data={[
                { value: 'Collaborator', label: 'Collaborator' },
                { value: 'Viewer', label: 'Viewer' },
              ]}
              value={newRole}
              onChange={(val) => setNewRole(val || 'Collaborator')}
              size='xs'
              style={{ width: 130 }}
            />
            <Button
              size='xs'
              leftIcon={<IconUserPlus size={14} />}
              onClick={handleAddCollaborator}
              loading={addCollaborator.isPending}
              disabled={!newUserId.trim()}
            >
              Add
            </Button>
          </Group>
        </Box>
      )}
    </Stack>
  );
}
