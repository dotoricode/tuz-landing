import type { GlobalConfig } from "payload";
import { isAdmin } from "../access/isAdmin.ts";
import { revalidateGlobal } from "../hooks/revalidate.ts";

export const Settings: GlobalConfig = {
  slug: "settings",
  admin: { group: "Globals" },
  access: {
    read: () => true,
    update: isAdmin,
  },
  fields: [
    {
      name: "tagline",
      type: "text",
      localized: true,
      defaultValue: "Have a Tuz day!",
    },
    { name: "wifiSsid", type: "text", defaultValue: "Tuz_Guest" },
    { name: "wifiPassword", type: "text", defaultValue: "tuz12345" },
    {
      name: "kakaoAppKey",
      type: "text",
      admin: { description: "Public Kakao Maps JS key" },
    },
    {
      name: "social",
      type: "group",
      fields: [
        { name: "instagram", type: "text", defaultValue: "tuzz2026" },
        { name: "youtube", type: "text", defaultValue: "monday_channel94" },
      ],
    },
    { name: "heroImage", type: "upload", relationTo: "media" },
    { name: "ogImage", type: "upload", relationTo: "media" },
  ],
  hooks: {
    afterChange: [revalidateGlobal("settings")],
  },
};
