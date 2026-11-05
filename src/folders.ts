/**
 * Folder names used by the original, Chinese-only releases ("handwritten notes", "exports", "templates"), written
 * as escapes so the source stays English. Vaults that already contain these folders keep using them.
 */
export const LEGACY_FOLDER = '\u624b\u5199\u7b14\u8bb0';
export const LEGACY_EXPORT = '\u5bfc\u51fa';
export const LEGACY_TEMPLATES = '\u6a21\u677f';

export interface FolderSettings { folder: string; exportFolder: string; templateFolder: string }

/**
 * Decide the notebook/export/template folder names on first run after the language switch was introduced.
 * A value that was saved before is never touched. For the rest, a vault that already contains the original Chinese
 * folder keeps it; everything else (new installs) gets the localized default. The result is meant to be persisted,
 * so changing the UI language later does not silently point the plugin at a different folder.
 */
export async function resolveFolders(
  saved: Partial<FolderSettings>,
  exists: (path: string) => Promise<boolean>,
  defaults: FolderSettings,
): Promise<{ settings: FolderSettings; changed: boolean }> {
  const settings: FolderSettings = {
    folder: saved.folder ?? '',
    exportFolder: saved.exportFolder ?? '',
    templateFolder: saved.templateFolder ?? '',
  };
  let changed = false;
  if (saved.folder === undefined) {
    settings.folder = (await exists(LEGACY_FOLDER)) ? LEGACY_FOLDER : defaults.folder;
    changed = true;
  }
  const sub = async (key: 'exportFolder' | 'templateFolder', legacy: string) => {
    if (saved[key] !== undefined) return;
    settings[key] = (await exists(`${settings.folder}/${legacy}`)) ? legacy : defaults[key];
    changed = true;
  };
  await sub('exportFolder', LEGACY_EXPORT);
  await sub('templateFolder', LEGACY_TEMPLATES);
  return { settings, changed };
}
