import type { CollectionConfig } from "payload";
import { isAdmin } from "../access/isAdmin.ts";
import { isPublished } from "../access/isPublished.ts";
import { revalidateCollection } from "../hooks/revalidate.ts";

export const MenuItems: CollectionConfig = {
  slug: "menuItems",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "category", "price", "isSignature", "published"],
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
    {
      name: "nameEn",
      type: "text",
      admin: { description: "영문 병기 (로케일 무관, 모든 언어에서 함께 노출)" },
    },
    { name: "description", type: "textarea", localized: true },
    {
      name: "price",
      type: "text",
      admin: { description: 'Display string, e.g. "4,000"' },
    },
    {
      name: "category",
      type: "select",
      defaultValue: "COFFEE",
      options: [
        { label: "Coffee", value: "COFFEE" },
        { label: "Non-coffee", value: "NON_COFFEE" },
        { label: "Bakery", value: "BAKERY" },
        { label: "Dessert", value: "DESSERT" },
        { label: "Seasonal", value: "SEASONAL" },
      ],
    },
    {
      name: "tag",
      type: "select",
      options: [
        { label: "(none)", value: "" },
        { label: "New", value: "NEW" },
        { label: "Best", value: "BEST" },
        { label: "Seasonal", value: "SEASONAL" },
      ],
    },
    { name: "isSignature", type: "checkbox", defaultValue: false, index: true },
    { name: "photo", type: "upload", relationTo: "media" },
    { name: "sortOrder", type: "number", defaultValue: 0 },
    { name: "published", type: "checkbox", defaultValue: true, index: true },
  ],
  hooks: {
    afterChange: [revalidateCollection("menuItems")],
  },
  timestamps: true,
};
