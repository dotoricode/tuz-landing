import type { CollectionConfig } from "payload";
import { isAdmin } from "../access/isAdmin.ts";
import { isPublished } from "../access/isPublished.ts";
import { revalidateCollection } from "../hooks/revalidate.ts";

export const Gallery: CollectionConfig = {
  slug: "gallery",
  admin: {
    useAsTitle: "altText",
    defaultColumns: ["altText", "featured", "sortOrder"],
    group: "Content",
  },
  access: {
    read: isPublished,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    { name: "image", type: "upload", relationTo: "media", required: true },
    { name: "altText", type: "text", required: true, localized: true },
    { name: "caption", type: "text", localized: true },
    { name: "featured", type: "checkbox", defaultValue: false },
    { name: "sortOrder", type: "number", defaultValue: 0 },
    { name: "published", type: "checkbox", defaultValue: true, index: true },
  ],
  hooks: {
    afterChange: [revalidateCollection("gallery")],
  },
  timestamps: true,
};
