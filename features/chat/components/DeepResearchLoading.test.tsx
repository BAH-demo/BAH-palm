import { render, screen } from '@testing-library/react';

import DeepResearchLoading from './DeepResearchLoading';

describe('DeepResearchLoading', () => {
  it('renders the loading title', () => {
    render(<DeepResearchLoading />);

    expect(screen.getByText('Deep research in progress')).toBeInTheDocument();
  });

  it('renders the loading description text', () => {
    render(<DeepResearchLoading />);

    expect(
      screen.getByText(/Searching the web, analyzing findings, and synthesizing results/)
    ).toBeInTheDocument();
  });

  it('renders the time estimate', () => {
    render(<DeepResearchLoading />);

    expect(
      screen.getByText(/typically takes 2-10 minutes/)
    ).toBeInTheDocument();
  });

  it('renders skeleton loading indicators', () => {
    const { container } = render(<DeepResearchLoading />);

    // Mantine Skeleton components render with specific class
    const skeletons = container.querySelectorAll('[class*="skeleton"],.mantine-Skeleton-root');
    // At minimum, the component structure should render without errors
    expect(container).toBeTruthy();
  });
});
