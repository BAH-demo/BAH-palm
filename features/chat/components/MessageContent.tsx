import Markdown from '@/components/content/Markdown';

type MessageContentProps = {
  content: string;
};

export default function MessageContent({ content }: MessageContentProps) {
  return <Markdown value={content} />;
}
