import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Items from '../Items';
import { DataProvider } from '../../state/DataContext';

// react-window needs a measurable size in JSDOM
jest.mock('react-window', () => ({
  FixedSizeList: ({ children, itemCount }) => (
    <div data-testid="virtual-list">
      {Array.from({ length: itemCount }).map((_, index) =>
        children({ index, style: {} })
      )}
    </div>
  ),
}));

function mockFetchOnce(payload) {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(payload),
    })
  );
}

function renderItems() {
  return render(
    <MemoryRouter>
      <DataProvider>
        <Items />
      </DataProvider>
    </MemoryRouter>
  );
}

describe('Items page', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders fetched items', async () => {
    mockFetchOnce({
      items: [
        { id: 1, name: 'Laptop Pro', category: 'Electronics', price: 2499 },
        { id: 2, name: 'Standing Desk', category: 'Furniture', price: 1199 },
      ],
      total: 2,
      page: 1,
      limit: 50,
    });

    renderItems();

    expect(await screen.findByText('Laptop Pro')).toBeInTheDocument();
    expect(screen.getByText('Standing Desk')).toBeInTheDocument();
    expect(screen.getByText(/Page 1 of 1/)).toBeInTheDocument();
  });

  test('debounces search and refetches with q param', async () => {
    const user = userEvent.setup();

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [], total: 0, page: 1, limit: 50 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [{ id: 1, name: 'Laptop Pro', price: 2499 }],
            total: 1,
            page: 1,
            limit: 50,
          }),
      });

    renderItems();

    const input = await screen.findByLabelText(/search items/i);
    await user.type(input, 'laptop');

    await waitFor(() => {
      const calls = global.fetch.mock.calls.map((c) => c[0]);
      expect(calls.some((url) => url.includes('q=laptop'))).toBe(true);
    });
  });

  test('shows empty state when no results', async () => {
    mockFetchOnce({ items: [], total: 0, page: 1, limit: 50 });
    renderItems();
    expect(await screen.findByText(/no items found/i)).toBeInTheDocument();
  });

  test('aborts in-flight request on unmount (no leak)', async () => {
    const abortSpy = jest.spyOn(AbortController.prototype, 'abort');
    mockFetchOnce({ items: [], total: 0, page: 1, limit: 50 });

    const { unmount } = renderItems();
    await act(async () => {
      unmount();
    });

    expect(abortSpy).toHaveBeenCalled();
    abortSpy.mockRestore();
  });
});