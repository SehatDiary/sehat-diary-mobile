import { QueryClient } from "@tanstack/react-query";

// One shared client, exported so that code outside the React tree — the axios
// interceptor that ends a rejected session — can drop the cache with it.
export const queryClient = new QueryClient();

// Everything cached here belongs to whoever was signed in: no query key is
// user-scoped, so a second person signing in on the same device would be
// served the first one's family members and medicines from cache while the
// refetch ran. This is health data; it leaves with the session.
export const clearCachedSession = () => {
  queryClient.clear();
};
