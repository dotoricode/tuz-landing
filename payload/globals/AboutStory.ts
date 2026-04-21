import type { GlobalConfig } from "payload";
import { isAdmin } from "../access/isAdmin.ts";
import { revalidateGlobal } from "../hooks/revalidate.ts";

export const AboutStory: GlobalConfig = {
  slug: "aboutStory",
  admin: { group: "Globals" },
  access: {
    read: () => true,
    update: isAdmin,
  },
  fields: [
    { name: "body", type: "richText", localized: true },
    { name: "signatureName", type: "text", localized: true },
    { name: "portrait", type: "upload", relationTo: "media" },
    { name: "published", type: "checkbox", defaultValue: true },
  ],
  hooks: {
    afterChange: [revalidateGlobal("aboutStory")],
  },
};
