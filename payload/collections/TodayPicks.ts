import type { CollectionConfig } from "payload";
import { isAdmin } from "../access/isAdmin.ts";
import { isPublished } from "../access/isPublished.ts";
import { revalidateCollection } from "../hooks/revalidate.ts";

export const TodayPicks: CollectionConfig = {
  slug: "todayPicks",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "barista", "date", "active"],
    group: "Content",
  },
  access: {
    read: isPublished,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    { name: "name", type: "text", required: true, localized: true },
    { name: "note", type: "textarea", localized: true },
    { name: "price", type: "text" },
    {
      name: "barista",
      type: "select",
      required: true,
      defaultValue: "owner_big",
      options: [
        { label: "큰 사장 pick", value: "owner_big" },
        { label: "작은 사장 pick", value: "owner_small" },
      ],
    },
    { name: "date", type: "date", required: true, defaultValue: () => new Date().toISOString() },
    { name: "photo", type: "upload", relationTo: "media" },
    { name: "active", type: "checkbox", defaultValue: true, index: true },
    { name: "sortOrder", type: "number", defaultValue: 0 },
    { name: "published", type: "checkbox", defaultValue: true, index: true },
  ],
  hooks: {
    afterChange: [revalidateCollection("todayPicks")],
  },
  timestamps: true,
};
