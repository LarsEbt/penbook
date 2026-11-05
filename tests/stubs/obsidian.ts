// Minimal stand-in so modules that import from "obsidian" can be bundled and run under plain Node.
export const addIcon = () => {};
export const Platform = { isDesktopApp: false };
export class Notice {}
export class Modal {}
export class Setting {}
export class Menu {}
export const normalizePath = (p: string) => p.replace(/\/+/g, '/').replace(/^\/|\/$/g, '') || '/';
