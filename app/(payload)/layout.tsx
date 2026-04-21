import type { Metadata } from "next";
import type { ServerFunctionClient } from "payload";
import config from "@payload-config";
import { RootLayout, handleServerFunctions } from "@payloadcms/next/layouts";

import { importMap } from "./admin/importMap.js";

import "@payloadcms/next/css";
import "./custom.scss";

export const metadata: Metadata = {
  title: "Tuz Admin",
};

const serverFunction: ServerFunctionClient = async function (args) {
  "use server";
  return handleServerFunctions({
    ...args,
    config,
    importMap,
  });
};

const Layout = ({ children }: { children: React.ReactNode }) => (
  <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
    {children}
  </RootLayout>
);

export default Layout;
