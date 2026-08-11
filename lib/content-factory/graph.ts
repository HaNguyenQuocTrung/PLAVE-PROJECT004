import type { GradePack, PrerequisiteEdge, ValidationDiagnostic } from "./types.ts";

export type GraphReport = Readonly<{
  nodes: readonly string[];
  edges: readonly PrerequisiteEdge[];
  diagnostics: readonly ValidationDiagnostic[];
}>;

export function buildPrerequisiteGraph(packs: readonly GradePack[]): GraphReport {
  const skillGrade = new Map(packs.flatMap((pack) => pack.skills.map((skill) => [skill.id, skill.grade] as const)));
  const edges = packs.flatMap((pack) => pack.prerequisites);
  const diagnostics: ValidationDiagnostic[] = [];
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    if (!skillGrade.has(edge.fromSkillId) || !skillGrade.has(edge.toSkillId)) diagnostics.push({ code: "MISSING_PREREQUISITE_REFERENCE", severity: "ERROR", entityId: `${edge.fromSkillId}->${edge.toSkillId}`, message: "Prerequisite edge references a missing skill." });
    const fromGrade = skillGrade.get(edge.fromSkillId);
    const toGrade = skillGrade.get(edge.toSkillId);
    if (fromGrade !== undefined && toGrade !== undefined && fromGrade > toGrade) diagnostics.push({ code: "FORWARD_GRADE_REFERENCE", severity: "WARNING", entityId: `${edge.fromSkillId}->${edge.toSkillId}`, message: "Prerequisite points from a higher grade to a lower grade." });
    adjacency.set(edge.fromSkillId, [...(adjacency.get(edge.fromSkillId) ?? []), edge.toSkillId]);
  }
  const visiting = new Set<string>(); const visited = new Set<string>();
  const visit = (node: string) => {
    if (visiting.has(node)) { diagnostics.push({ code: "PREREQUISITE_CYCLE", severity: "ERROR", entityId: node, message: "Cycle detected." }); return; }
    if (visited.has(node)) return;
    visiting.add(node); for (const next of adjacency.get(node) ?? []) visit(next); visiting.delete(node); visited.add(node);
  };
  for (const node of skillGrade.keys()) visit(node);
  const connected = new Set(edges.flatMap((edge) => [edge.fromSkillId, edge.toSkillId]));
  for (const node of skillGrade.keys()) if (!connected.has(node)) diagnostics.push({ code: "ORPHAN_SKILL", severity: "INFO", entityId: node, message: "No prerequisite edge is yet evidenced for this skill." });
  return { nodes: [...skillGrade.keys()].sort(), edges: [...edges].sort((a, b) => `${a.fromSkillId}:${a.toSkillId}`.localeCompare(`${b.fromSkillId}:${b.toSkillId}`)), diagnostics };
}
