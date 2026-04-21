import type { CollectionConfig } from "payload";

export const Users: CollectionConfig = {
  slug: "users",
  auth: true,
  admin: { useAsTitle: "email", group: "System" },
  access: {
    read: ({ req: { user } }) => Boolean(user),
    create: ({ req: { user } }) => Boolean(user?.role === "owner"),
    update: ({ req: { user } }) => Boolean(user?.role === "owner"),
    delete: ({ req: { user } }) => Boolean(user?.role === "owner"),
  },
  fields: [
    {
      name: "role",
      type: "select",
      required: true,
      defaultValue: "editor",
      admin: {
        description:
          "Promote to 'owner' manually for the first account; subsequent accounts default to 'editor'.",
      },
      options: [
        { label: "Owner", value: "owner" },
        { label: "Admin", value: "admin" },
        { label: "Editor", value: "editor" },
      ],
    },
    { name: "name", type: "text" },
  ],
};
