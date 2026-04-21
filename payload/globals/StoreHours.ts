import type { GlobalConfig } from "payload";
import { isAdmin } from "../access/isAdmin.ts";
import { revalidateGlobal } from "../hooks/revalidate.ts";

export const StoreHours: GlobalConfig = {
  slug: "storeHours",
  admin: { group: "Globals" },
  access: {
    read: () => true,
    update: isAdmin,
  },
  fields: [
    { name: "weekday", type: "text", defaultValue: "08:00-22:00" },
    { name: "weekend", type: "text", defaultValue: "10:00-23:00" },
    {
      name: "regularClosure",
      type: "text",
      localized: true,
      defaultValue: "매월 마지막 월요일",
    },
    { name: "holidayNotice", type: "textarea", localized: true },
    { name: "timezone", type: "text", defaultValue: "Asia/Seoul" },
  ],
  hooks: {
    afterChange: [revalidateGlobal("storeHours")],
  },
};
