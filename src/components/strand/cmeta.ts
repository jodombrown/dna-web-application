// Ported from Strand components/dna/cmeta.js (extraction 3654dd17). Behavior unchanged.
export type C = "connect" | "convene" | "collaborate" | "contribute" | "convey";
export type CardC = C | "system";

export const C_LABEL: Record<C, string> = {
  connect: "Connect",
  convene: "Convene",
  collaborate: "Collaborate",
  contribute: "Contribute",
  convey: "Convey",
};

export const C_GLYPH: Record<C | "brand", string> = {
  connect: "nkonsonkonson",
  convene: "mpatapo",
  collaborate: "funtunfunefu-denkyemfunefu",
  contribute: "adinkrahene",
  convey: "sankofa",
  brand: "mate-masie",
};

export const C_ORDER: C[] = ["connect", "convene", "collaborate", "contribute", "convey"];

/** Strand assets are served from public/strand (icons/, adinkra/, patterns/). */
export const STRAND_ASSET_BASE = "/strand/";
export function assetBase(): string {
  return STRAND_ASSET_BASE;
}
