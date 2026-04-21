import type { CollectionConfig } from "payload";
import { isAdmin } from "../access/isAdmin.ts";
import { isPublished } from "../access/isPublished.ts";
import {
  revalidateCollection,
  revalidateCollectionDelete,
} from "../hooks/revalidate.ts";

export const Faqs: CollectionConfig = {
  slug: "faqs",
  admin: {
    useAsTitle: "question",
    defaultColumns: ["question", "category", "sortOrder", "published"],
    group: "Content",
  },
  access: {
    read: isPublished,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    { name: "question", type: "text", required: true, localized: true },
    { name: "answer", type: "richText", localized: true },
    {
      name: "category",
      type: "select",
      defaultValue: "general",
      options: [
        { label: "일반", value: "general" },
        { label: "방문", value: "visit" },
        { label: "메뉴", value: "menu" },
      ],
    },
    { name: "sortOrder", type: "number", defaultValue: 0 },
    { name: "published", type: "checkbox", defaultValue: true, index: true },
  ],
  hooks: {
    afterChange: [revalidateCollection("faqs")],
    afterDelete: [revalidateCollectionDelete("faqs")],
  },
  timestamps: true,
};
