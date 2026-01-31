import type { ManifestType } from '@repo/shared';

export interface IManifestParser {
  convertManifestToString: (manifest: ManifestType, isFirefox: boolean) => string;
}
