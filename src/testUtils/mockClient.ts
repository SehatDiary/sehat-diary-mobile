// Shared mock for the axios client used by every API module.
// Contract fixtures in these tests mirror sehat_diary/docs/API_CONTRACT.md —
// when a fixture changes, the backend contract changed and both sides must agree.

export const mockClient = {
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
};

export const resetMockClient = () => {
  mockClient.get.mockReset();
  mockClient.post.mockReset();
  mockClient.patch.mockReset();
  mockClient.delete.mockReset();
};
