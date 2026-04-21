import type { CollectionConfig } from "payload";
import { isAdmin } from "../access/isAdmin.ts";
import { isPublished } from "../access/isPublished.ts";
import { revalidateCollection } from "../hooks/revalidate.ts";

export const Winners: CollectionConfig = {
  slug: "winners",
  admin: {
    useAsTitle: "nick",
    defaultColumns: ["nick", "period", "rewardType", "sortOrder"],
    group: "Content",
  },
  access: {
    read: isPublished,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    { name: "nick", type: "text", required: true },
    {
      name: "rewardType",
      type: "select",
      defaultValue: "free_drink_month",
      options: [{ label: "무료 음료", value: "free_drink_month" }],
    },
    {
      name: "period",
      type: "text",
      required: true,
      admin: { description: 'Period label, e.g. "2026.05"' },
    },
    { name: "month", type: "text", defaultValue: "무료음료" },
    { name: "photo", type: "upload", relationTo: "media" },
    { name: "sortOrder", type: "number", defaultValue: 0 },
    { name: "published", type: "checkbox", defaultValue: true, index: true },
  ],
  hooks: {
    afterChange: [revalidateCollection("winners")],
  },
  timestamps: true,
};
