import { render, screen } from '@testing-library/react';

import MessageContent from './MessageContent';

jest.mock('@/components/content/Markdown', () => {
  return function Markdown({ value }: { value: string }) {
    return <div data-testid='markdown-content'>{value}</div>;
  };
});

describe('MessageContent', () => {
  it('renders the Markdown component with the provided content', () => {
    render(<MessageContent content='Hello, world!' />);

    const markdown = screen.getByTestId('markdown-content');
    expect(markdown).toBeInTheDocument();
    expect(markdown).toHaveTextContent('Hello, world!');
  });

  it('renders markdown content with special characters', () => {
    const specialContent = '# Heading\n\n**Bold** text with `code`';
    render(<MessageContent content={specialContent} />);

    const markdown = screen.getByTestId('markdown-content');
    expect(markdown).toBeInTheDocument();
    expect(markdown.textContent).toContain('Heading');
    expect(markdown.textContent).toContain('Bold');
    expect(markdown.textContent).toContain('code');
  });

  it('renders empty content', () => {
    render(<MessageContent content='' />);

    const markdown = screen.getByTestId('markdown-content');
    expect(markdown).toBeInTheDocument();
    expect(markdown).toHaveTextContent('');
  });

  it('renders long content', () => {
    const longContent = 'A'.repeat(10000);
    render(<MessageContent content={longContent} />);

    const markdown = screen.getByTestId('markdown-content');
    expect(markdown).toBeInTheDocument();
    expect(markdown).toHaveTextContent(longContent);
  });
});
