import { forwardRef, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import {
  Group,
  MultiSelect,
  MultiSelectValueProps,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';

import { useChat } from '@/features/chat/providers/ChatProvider';
import useGetChatDocuments from '@/features/chat/api/get-chat-documents';
import { useGetSystemConfig } from '@/features/shared/api/get-system-config';
import Loading from '@/features/shared/components/Loading';

type SelectItemProps = {
  label: string;
  selected: boolean;
};

type DisplayValueProps = MultiSelectValueProps & {
  documentIds: string[];
}

function DisplayValue({
  documentIds, onRemove: _Remove, ...others
}: DisplayValueProps) {
  return (
    <Title
      {...others}
      order={2}
      sx={(theme) => ({
        cursor: 'default',
        color: theme.colors.gray[6],
        backgroundColor: theme.colors.dark[7],
        border: theme.colors.dark[7],
        borderRadius: theme.radius.sm,
        margin: 'inherit',
        padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
        display: 'none',
        ':last-of-type': {
          display: 'block',
        },
      })}
    >
      {documentIds.length} Document
      {documentIds.length === 1 ? '' : 's'} Selected
    </Title>
  );
};

const SelectItem = forwardRef<HTMLDivElement, SelectItemProps>(
  function SelectItemWithRef(props, ref) {
    return (
      <Group spacing='sm' {...props} ref={ref}>
        {props.selected && (
          <ThemeIcon size='sm'>
            <IconCheck />
          </ThemeIcon>
        )}
        {props.label.length > 33 ?
          `${props.label.slice(0, 33)}...` :
        props.label}
      </Group>
    );
  }
);

SelectItem.displayName = 'DocumentLibraryFileSelectItem';

export default function ChatDocumentLibraryFileSelect() {
  const { documentIds, setDocumentIds } = useChat();
  const router = useRouter();
  const hasInitializedFromQuery = useRef(false);

  const {
    data: systemConfig,
    isPending: systemConfigIsLoading,
  } = useGetSystemConfig();

  const documentUploadProviderId = systemConfig?.documentLibraryDocumentUploadProviderId || '';

  const {
    data: userDocuments,
    isPending: userDocumentsIsPending,
  } = useGetChatDocuments({
    documentUploadProviderId,
  });

  const documentOptions = useMemo(() => {
    if (!userDocuments?.documents) {
      return [];
    }

    return userDocuments.documents.map((document) => ({
      value: document.id,
      label: document.filename,
    }));
  }, [userDocuments]);

  // On initial load, preselect documents based on document_ids query parameter
  useEffect(() => {
    if (router.isReady && documentOptions.length > 0 && !hasInitializedFromQuery.current) {
      const documentIdsParam = router.query.document_ids as string;
      if (documentIdsParam) {
        const queryDocumentIds = documentIdsParam.split(',');
        // Only preselect documents that exist in the available options
        const validDocumentIds = queryDocumentIds.filter(id => 
          documentOptions.some(option => option.value === id)
        );
        if (validDocumentIds.length > 0) {
          setDocumentIds(validDocumentIds);
        }
        hasInitializedFromQuery.current = true;
      } else if (!documentIdsParam) {
        // Mark as initialized even if no query param exists
        hasInitializedFromQuery.current = true;
      }
    }
  }, [router.isReady, router.query.document_ids, documentOptions, setDocumentIds]);

  const selectPlaceholder = documentOptions.length > 0 ?
    'Select document(s)' :
    'No documents available';

  if (systemConfigIsLoading) {
    return <Loading />;
  }

  if (!documentUploadProviderId) {
    return null;
  }

  if (userDocumentsIsPending) {
    return <Loading />;
  }

  return (
    <MultiSelect
      name='document-library-multiselect'
      aria-label={selectPlaceholder}
      placeholder={selectPlaceholder}
      data={documentOptions}
      value={documentIds}
      valueComponent={(props) => (
        <DisplayValue {...props} documentIds={documentIds} />
      )}
      disableSelectedItemFiltering
      itemComponent={SelectItem}
      data-testid='document-library-multiselect'
      searchable
      onChange={setDocumentIds}
      disabled={documentOptions.length === 0}
      maxDropdownHeight={500}
    />
  );
}
