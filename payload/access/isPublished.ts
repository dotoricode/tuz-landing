import type { Access } from "payload";

export const isPublished: Access = ({ req: { user } }) => {
  if (user) return true;
  return {
    published: { equals: true },
  };
};
