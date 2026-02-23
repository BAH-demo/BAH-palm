import { render, screen } from '@testing-library/react';

import ChatFooter from './ChatFooter';

jest.mock('@/features/chat/components/forms/ChatForm', () => {
  return function ChatForm() {
    return <div data-testid='chat-form'>Chat Form Mock</div>;
  };
});

describe('ChatFooter', () => {
  it('renders the ChatForm component', () => {
    render(<ChatFooter />);

    const chatForm = screen.getByTestId('chat-form');
    expect(chatForm).toBeInTheDocument();
    expect(chatForm).toHaveTextContent('Chat Form Mock');
  });
});
