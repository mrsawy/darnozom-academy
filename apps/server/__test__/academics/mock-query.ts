/** Chainable stand-in for a Mongoose Query: builder methods return the query, exec() resolves `value`. */
export function mockQuery<T>(value: T) {
  const query = {
    lean: jest.fn(),
    sort: jest.fn(),
    select: jest.fn(),
    limit: jest.fn(),
    exec: jest.fn().mockResolvedValue(value),
  };
  query.lean.mockReturnValue(query);
  query.sort.mockReturnValue(query);
  query.select.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  return query;
}
