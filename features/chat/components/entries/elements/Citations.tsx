import { Avatar, HoverCard, Stack, Text, Title, Divider } from '@mantine/core';
import { IconFileDescription } from '@tabler/icons-react';

type CitationsProps = Readonly<{
  citations: Array<{
    knowledgeBaseId?: string | null;
    documentId?: string | null;
    sourceLabel: string;
    citation: string;
  }>;
}>;

const CitationContent = ({ citation, sourceLabel }: { citation: string; sourceLabel: string }) => {
  return (
    <Stack spacing='xs'>
      <Title weight='bold' color='blue' order={3}>
        {sourceLabel}
      </Title>
      <Text size='sm' color='gray.7'>
        {citation}
      </Text>
    </Stack>
  );
};

export default function Citations({ citations }: CitationsProps) {
  const MAX_DISPLAYED_CITATION_ICONS = 3;
  const displayedCitations = citations.slice(0, MAX_DISPLAYED_CITATION_ICONS);

  const remainingCitations = citations.slice(MAX_DISPLAYED_CITATION_ICONS);
  const remainingCitationsCount = remainingCitations.length;

  const remainingCitationsHovercardContent = (
    <Stack spacing='md'>
      {remainingCitations.map((citation, index) => (
        <div key={`${citation.citation}-${citation.sourceLabel}`}>
          <CitationContent 
            citation={citation.citation} 
            sourceLabel={citation.sourceLabel} 
          />
          {index < remainingCitations.length - 1 && <Divider color='gray.2' />}
        </div>
      ))}
    </Stack>
  );

  return (
    <Avatar.Group spacing='sm'>
      {displayedCitations.map((citation, index) => (
        <div key={`${citation.citation}-${citation.sourceLabel}`}>
          <HoverCard shadow='md' withArrow position='bottom'>
            <HoverCard.Target>
              <Avatar
                data-testid={`displayed-avatar-${index}`}
                color='dark.6'
                bg='gray.0'
                radius='xl'
                size='sm'
              >
                <IconFileDescription />
              </Avatar>
            </HoverCard.Target>
            <HoverCard.Dropdown
              style={{ 
                maxWidth: '50%', 
                maxHeight: '50%', 
                overflow: 'auto',
              }}
            >
              <CitationContent 
                citation={citation.citation} 
                sourceLabel={citation.sourceLabel} 
              />
            </HoverCard.Dropdown>
          </HoverCard>
        </div>
      ))}
      {remainingCitationsCount > 0 && (
        <HoverCard shadow='md' withArrow position='bottom'>
          <HoverCard.Target>
            <Avatar
              data-testid='remaining-citations-avatar'
              color='dark.6'
              bg='gray.0'
              radius='xl'
              size='sm'
            >
              +{remainingCitationsCount}
            </Avatar>
          </HoverCard.Target>
          <HoverCard.Dropdown
            style={{ 
              maxWidth: '50%', 
              maxHeight: '50%', 
              overflow: 'auto',
            }}
          >
            {remainingCitationsHovercardContent}
          </HoverCard.Dropdown>
        </HoverCard>
      )}
    </Avatar.Group>
  );
}
