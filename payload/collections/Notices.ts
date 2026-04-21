import type { CollectionConfig } from "payload";
import { isAdmin } from "../access/isAdmin.ts";
import { isPublished } from "../access/isPublished.ts";
import {
  revalidateCollection,
  revalidateCollectionDelete,
} from "../hooks/revalidate.ts";

export const Notices: CollectionConfig = {
  slug: "notices",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "tag", "date", "isPinned", "published"],
    group: "Content",
  },
  access: {
    read: isPublished,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    { name: "title", type: "text", required: true, localized: true },
    { name: "body", type: "richText", localized: true },
    {
      name: "tag",
      type: "select",
      defaultValue: "NOTICE",
      options: [
        { label: "Notice", value: "NOTICE" },
        { label: "Event", value: "EVENT" },
        { label: "New", value: "NEW" },
        { label: "Hours", value: "HOURS" },
        { label: "Season", value: "SEASON" },
      ],
    },
    { name: "date", type: "date", required: true, defaultValue: () => new Date().toISOString() },
    { name: "photo", type: "upload", relationTo: "media" },
    {
      name: "isPinned",
      type: "checkbox",
      defaultValue: false,
      admin: { description: "Pin to home marquee" },
    },
    { name: "sortOrder", type: "number", defaultValue: 0 },
    { name: "published", type: "checkbox", defaultValue: true, index: true },
  ],
  hooks: {
    afterChange: [revalidateCollection("notices")],
    afterDelete: [revalidateCollectionDelete("notices")],
  },
  timestamps: true,
};
