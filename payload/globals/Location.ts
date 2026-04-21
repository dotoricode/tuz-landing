import type { GlobalConfig } from "payload";
import { isAdmin } from "../access/isAdmin.ts";
import { revalidateGlobal } from "../hooks/revalidate.ts";

export const Location: GlobalConfig = {
  slug: "location",
  admin: { group: "Globals" },
  access: {
    read: () => true,
    update: isAdmin,
  },
  fields: [
    {
      name: "address",
      type: "text",
      localized: true,
      defaultValue: "울산광역시 중구 염포로22, 2층",
    },
    { name: "addressShort", type: "text", localized: true },
    { name: "phone", type: "text" },
    { name: "lat", type: "number", defaultValue: 35.5596 },
    { name: "lng", type: "number", defaultValue: 129.3443 },
    { name: "kakaoPlaceId", type: "text" },
    { name: "directions", type: "richText", localized: true },
  ],
  hooks: {
    afterChange: [revalidateGlobal("location")],
  },
};
