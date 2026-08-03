export type FractionSemanticColor = Readonly<{
  id: string;
  label: string;
  fill: string;
}>;

const FRACTION_COLORS: Readonly<Record<string, FractionSemanticColor>> = Object.freeze({
  xanh: { id: "blue", label: "xanh", fill: "#2563eb" },
  lam: { id: "cyan", label: "lam", fill: "#0891b2" },
  lục: { id: "green", label: "lục", fill: "#15803d" },
  vàng: { id: "yellow", label: "vàng", fill: "#ca8a04" },
  tím: { id: "purple", label: "tím", fill: "#7e22ce" },
  cam: { id: "orange", label: "cam", fill: "#ea580c" },
});

export function fractionSemanticColor(label: string): FractionSemanticColor {
  const color = FRACTION_COLORS[label.toLocaleLowerCase("vi")];
  if (!color) throw new Error("GENERATION_V2:UNKNOWN_FRACTION_COLOR");
  return color;
}

export function fractionSemanticColorById(id: string): FractionSemanticColor | null {
  return Object.values(FRACTION_COLORS).find((color) => color.id === id) ?? null;
}
