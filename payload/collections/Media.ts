import type { CollectionConfig } from "payload";
import { isAdmin } from "../access/isAdmin.ts";

export const Media: CollectionConfig = {
  slug: "media",
  upload: {
    staticDir: "media",
    mimeTypes: ["image/*"],
    imageSizes: [
      { name: "thumb", width: 320, height: 320, position: "centre" },
      { name: "card", width: 800 },
      { name: "hero", width: 1600 },
      { name: "og", width: 1200, height: 630, position: "centre" },
    ],
    adminThumbnail: "thumb",
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: "alt",
      type: "text",
      required: true,
      localized: true,
    },
    { name: "credit", type: "text" },
  ],
};
