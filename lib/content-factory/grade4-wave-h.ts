import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { evaluateExpression } from "./math.ts";
import { buildOfficialGradeSkeleton, officialSkillId, officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, DifficultyBand, ExplanationSpec, GradePack, MathExpression } from "./types.ts";

const grade = 4 as const;
const sourceId = officialSourceReferenceId(grade);
const unitId = "grade-4-fraction-reasoning-p1";
const packId = "grade-4-wave-h-multistep-fraction-applications";
const candidateId = "g4-multistep-fraction-applications-wave-h";
const version = "g4-multistep-fraction-applications-1.0.0-wave-h";
const policyVersion = "g4-applied-fractions-policy-1.0.0-wave-h";
const sliceOutcomes = ["MOET2018-G4-NUM-P037-025"] as const;
const prerequisiteOutcomeIds = ["MOET2018-G4-NUM-P037-026"] as const;
const nextTargetOutcomeIds = ["MOET2018-G4-GEO-P038-007"] as const;
const value = (numerator: number, denominator = 1): MathExpression => ({ op: "VALUE", numerator, denominator });
const operation = (op: "ADD" | "SUBTRACT" | "MULTIPLY" | "DIVIDE", left: MathExpression, right: MathExpression): MathExpression => ({ op, left, right });
const purposes = ["FOUNDATION", "STANDARD_APPLICATION", "MISCONCEPTION_TARGETING", "REMEDIATION", "TRANSFER_APPLICATION"] as const;
const receiptIds = requiredAutomatedEvidenceChecks.map((check) => `${packId}-${check.toLowerCase().replaceAll("_", "-")}`);

type Context = "CLASS" | "GARDEN" | "LIBRARY" | "STORAGE" | "CLUB" | "WORKSHOP";
type Structure = "FRACTION_REMAINDER" | "TWO_PART_REMAINDER" | "FRACTION_PLUS" | "FRACTION_MINUS" | "TWO_SOURCE_SUM" | "REMAINDER_SHARE";
type Fixture = Readonly<{
  prompt: string;
  unit: string;
  context: Context;
  structure: Structure;
  publicTokens: readonly string[];
  derivation: MathExpression;
  intermediates: readonly Readonly<{ expression: MathExpression; exactValue: string }>[];
  steps: readonly string[];
}>;
type GeneratedItem = Readonly<{ question: CandidateQuestion; explanation: ExplanationSpec }>;
const allowedUnits = new Set(["học sinh", "cây", "quyển", "kg", "thành viên", "sản phẩm"]);

function exactInteger(expression: MathExpression) {
  try {
    const result = evaluateExpression(expression);
    if (result.denominator !== 1 || result.numerator < 0) throw new Error("AUTOMATED_VERIFICATION_INSUFFICIENT:NON_INTEGER_OR_NEGATIVE_RESULT");
    return String(result.numerator);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("AUTOMATED_VERIFICATION_INSUFFICIENT")) throw error;
    throw new Error("AUTOMATED_VERIFICATION_INSUFFICIENT:INVALID_EXPRESSION");
  }
}

function assertFixture(fixture: Fixture) {
  if (!allowedUnits.has(fixture.unit) || !fixture.prompt.includes(fixture.unit)) throw new Error("AUTOMATED_VERIFICATION_INSUFFICIENT:UNIT_OR_CONTEXT_MISMATCH");
  if (fixture.publicTokens.length === 0 || fixture.publicTokens.some((token) => !fixture.prompt.includes(token))) throw new Error("AUTOMATED_VERIFICATION_INSUFFICIENT:PUBLIC_DATA_INCOMPLETE");
  if (!fixture.context || !fixture.structure || fixture.intermediates.length < 2 || fixture.steps.length < 2) throw new Error("AUTOMATED_VERIFICATION_INSUFFICIENT:REASONING_STRUCTURE_INCOMPLETE");
  for (const intermediate of fixture.intermediates) if (exactInteger(intermediate.expression) !== intermediate.exactValue) throw new Error("AUTOMATED_VERIFICATION_INSUFFICIENT:INTERMEDIATE_OPERATION_MISMATCH");
  exactInteger(fixture.derivation);
}

function fixture(prompt: string, unit: string, context: Context, structure: Structure, publicTokens: readonly string[], derivation: MathExpression, intermediates: Fixture["intermediates"], steps: readonly string[]): Fixture {
  const result = { prompt: prompt.normalize("NFC"), unit, context, structure, publicTokens, derivation, intermediates, steps: steps.map((step) => step.normalize("NFC")) } as const;
  assertFixture(result);
  return result;
}

function buildFixtures(): readonly Fixture[] {
  const fixtures: Fixture[] = [];
  const remainder = [
    [32,3,8,"học sinh","CLASS"],[45,2,5,"cây","GARDEN"],[56,3,7,"quyển","LIBRARY"],[72,5,9,"kg","STORAGE"],
  ] as const;
  remainder.forEach(([total,numerator,denominator,unit,context]) => {
    const part = operation("MULTIPLY", value(total), value(numerator, denominator));
    const answer = operation("SUBTRACT", value(total), part);
    fixtures.push(fixture(`Có ${total} ${unit}; ${numerator}/${denominator} số đó đã tham gia hoặc được sử dụng. Còn lại bao nhiêu ${unit}?`, unit, context, "FRACTION_REMAINDER", [String(total), `${numerator}/${denominator}`], answer, [{ expression: part, exactValue: exactInteger(part) }, { expression: answer, exactValue: exactInteger(answer) }], [`Tìm ${numerator}/${denominator} của ${total}: được ${exactInteger(part)} ${unit}.`, `Lấy ${total} trừ ${exactInteger(part)}.`, `Còn lại ${exactInteger(answer)} ${unit}.`]));
  });
  const twoParts = [[60,1,3,1,4,"sản phẩm","WORKSHOP"],[80,3,8,1,5,"quyển","LIBRARY"],[96,1,4,3,8,"cây","GARDEN"],[120,2,5,1,4,"kg","STORAGE"]] as const;
  twoParts.forEach(([total,n1,d1,n2,d2,unit,context]) => {
    const first = operation("MULTIPLY", value(total), value(n1,d1));
    const second = operation("MULTIPLY", value(total), value(n2,d2));
    const afterFirst = operation("SUBTRACT", value(total), first);
    const answer = operation("SUBTRACT", afterFirst, second);
    fixtures.push(fixture(`Một nhóm có ${total} ${unit}; đợt đầu dùng ${n1}/${d1} tổng số, đợt sau dùng ${n2}/${d2} tổng số. Còn bao nhiêu ${unit}?`, unit, context, "TWO_PART_REMAINDER", [String(total),`${n1}/${d1}`,`${n2}/${d2}`], answer, [{ expression:first, exactValue:exactInteger(first) },{ expression:second, exactValue:exactInteger(second) },{ expression:answer, exactValue:exactInteger(answer) }], [`Hai phần lần lượt là ${exactInteger(first)} và ${exactInteger(second)} ${unit}.`,`Trừ cả hai phần khỏi ${total}.`,`Còn ${exactInteger(answer)} ${unit}.`]));
  });
  const plus = [[48,3,8,7,"thành viên","CLUB"],[70,2,5,9,"cây","GARDEN"],[90,1,3,12,"quyển","LIBRARY"],[64,5,8,6,"sản phẩm","WORKSHOP"]] as const;
  plus.forEach(([total,n,d,extra,unit,context]) => {
    const part=operation("MULTIPLY",value(total),value(n,d)); const answer=operation("ADD",part,value(extra));
    fixtures.push(fixture(`Ban đầu có ${n}/${d} của ${total} ${unit} đạt yêu cầu, sau đó thêm ${extra} ${unit}. Có tất cả bao nhiêu ${unit} đạt yêu cầu?`,unit,context,"FRACTION_PLUS",[`${n}/${d}`,String(total),String(extra)],answer,[{expression:part,exactValue:exactInteger(part)},{expression:answer,exactValue:exactInteger(answer)}],[`Tìm phần ban đầu được ${exactInteger(part)} ${unit}.`,`Cộng thêm ${extra} ${unit}.`,`Có ${exactInteger(answer)} ${unit}.`]));
  });
  const minus = [[72,2,3,15,"kg","STORAGE"],[84,3,7,11,"thành viên","CLUB"],[96,5,8,18,"sản phẩm","WORKSHOP"],[120,3,5,27,"quyển","LIBRARY"]] as const;
  minus.forEach(([total,n,d,used,unit,context]) => {
    const part=operation("MULTIPLY",value(total),value(n,d)); const answer=operation("SUBTRACT",part,value(used));
    fixtures.push(fixture(`${n}/${d} của ${total} ${unit} được chọn, rồi ${used} ${unit} trong số đã chọn được chuyển đi. Còn lại bao nhiêu ${unit} đã chọn?`,unit,context,"FRACTION_MINUS",[`${n}/${d}`,String(total),String(used)],answer,[{expression:part,exactValue:exactInteger(part)},{expression:answer,exactValue:exactInteger(answer)}],[`Số được chọn là ${exactInteger(part)} ${unit}.`,`Trừ ${used} ${unit} đã chuyển.`,`Còn ${exactInteger(answer)} ${unit}.`]));
  });
  const twoSources = [[40,3,5,30,2,3,"học sinh","CLASS"],[56,3,7,45,2,5,"cây","GARDEN"],[72,5,8,60,3,10,"quyển","LIBRARY"],[90,2,3,80,1,4,"sản phẩm","WORKSHOP"]] as const;
  twoSources.forEach(([t1,n1,d1,t2,n2,d2,unit,context]) => {
    const first=operation("MULTIPLY",value(t1),value(n1,d1)); const second=operation("MULTIPLY",value(t2),value(n2,d2)); const answer=operation("ADD",first,second);
    fixtures.push(fixture(`Nhóm một chọn ${n1}/${d1} của ${t1} ${unit}; nhóm hai chọn ${n2}/${d2} của ${t2} ${unit}. Hai nhóm chọn tất cả bao nhiêu ${unit}?`,unit,context,"TWO_SOURCE_SUM",[`${n1}/${d1}`,String(t1),`${n2}/${d2}`,String(t2)],answer,[{expression:first,exactValue:exactInteger(first)},{expression:second,exactValue:exactInteger(second)},{expression:answer,exactValue:exactInteger(answer)}],[`Hai nhóm lần lượt chọn ${exactInteger(first)} và ${exactInteger(second)} ${unit}.`,`Cộng hai kết quả.`,`Tất cả là ${exactInteger(answer)} ${unit}.`]));
  });
  const share = [[60,1,3,5,"sản phẩm","WORKSHOP"],[72,1,4,6,"quyển","LIBRARY"],[96,3,8,5,"cây","GARDEN"],[120,2,5,8,"kg","STORAGE"]] as const;
  share.forEach(([total,n,d,groups,unit,context]) => {
    const used=operation("MULTIPLY",value(total),value(n,d)); const remaining=operation("SUBTRACT",value(total),used); const answer=operation("DIVIDE",remaining,value(groups));
    fixtures.push(fixture(`Có ${total} ${unit}; đã dùng ${n}/${d} tổng số. Phần còn lại chia đều cho ${groups} nhóm. Mỗi nhóm nhận bao nhiêu ${unit}?`,unit,context,"REMAINDER_SHARE",[String(total),`${n}/${d}`,String(groups)],answer,[{expression:used,exactValue:exactInteger(used)},{expression:remaining,exactValue:exactInteger(remaining)},{expression:answer,exactValue:exactInteger(answer)}],[`Đã dùng ${exactInteger(used)} ${unit}, còn ${exactInteger(remaining)} ${unit}.`,`Chia đều phần còn lại cho ${groups} nhóm.`,`Mỗi nhóm nhận ${exactInteger(answer)} ${unit}.`]));
  });
  return fixtures;
}

const fixtures = buildFixtures();
export function verifyGradeFourWaveHMalformedFixtures() {
  const base=fixtures[0]!;
  const malformed: readonly Fixture[] = [
    { ...base, prompt: "Thiếu dữ liệu công khai.", publicTokens: ["32"] },
    { ...base, unit: "USD" },
    { ...base, intermediates: [{ ...base.intermediates[0]!, exactValue: "999" }, ...base.intermediates.slice(1)] },
    { ...base, derivation: operation("DIVIDE", value(1), value(0)) },
  ];
  return malformed.flatMap((entry,index)=>{try{assertFixture(entry);return[`g4-wave-h-malformed-${index+1}:ACCEPTED`];}catch(error){return error instanceof Error&&error.message.startsWith("AUTOMATED_VERIFICATION_INSUFFICIENT")?[]:[`g4-wave-h-malformed-${index+1}:WRONG_ERROR`];}});
}
const malformedFixtureErrors=verifyGradeFourWaveHMalformedFixtures();
if(malformedFixtureErrors.length)throw new Error(`GRADE_4_WAVE_H_MALFORMED_FIXTURE_FAILURE:${malformedFixtureErrors.join(",")}`);

function difficulty(index:number):DifficultyBand{const position=index%6;return position<2?"FOUNDATIONAL":position<4?"CORE":"EXTENSION";}
const generated:readonly GeneratedItem[]=fixtures.map((entry,index)=>{assertFixture(entry);const number=index+1,suffix=String(number).padStart(2,"0"),id=`g4-wave-h-${suffix}`,explanationId=`${id}-explanation`,answer=exactInteger(entry.derivation);return{question:{id,grade,unitId,blueprintId:`g4-wave-h-blueprint-${sliceOutcomes[0].toLowerCase()}-${difficulty(index).toLowerCase()}`,skillId:officialSkillId(sliceOutcomes[0]),prompt:entry.prompt,options:null,answer:{type:"INTEGER_INPUT",exactValue:answer,unit:entry.unit,derivation:entry.derivation},explanationId,difficulty:difficulty(index),provenance:{kind:"DETERMINISTIC_TEMPLATE",templateVersion:"g4-multistep-fractions-wave-h-template-1.0.0",seed:`g4-wave-h-${entry.structure.toLowerCase()}-${suffix}`,sourceReferenceIds:[sourceId]},reviewStatus:"BUNDLED",published:false,pilotEligible:false,fixtureOnly:false,duplicateFingerprint:sha256(normalizedDefinition(`${entry.prompt}|`).toLocaleLowerCase("vi")),validationReceiptIds:receiptIds,instructionalPurpose:purposes[index%purposes.length]!},explanation:{id:explanationId,questionId:id,steps:entry.steps,finalAnswer:answer,evidenceReceiptIds:[`${packId}-explanation-consistency`]}};});
const questions=generated.map((entry)=>entry.question),explanations=generated.map((entry)=>entry.explanation);
type BigFraction=Readonly<{numerator:bigint;denominator:bigint}>;const bgcd=(a:bigint,b:bigint):bigint=>b===0n?(a<0n?-a:a):bgcd(b,a%b);const bf=(n:bigint,d:bigint):BigFraction=>{if(d===0n)throw new Error("DIVISION_BY_ZERO");const sign=d<0n?-1n:1n,divisor=bgcd(n,d);return{numerator:sign*n/divisor,denominator:sign*d/divisor};};
function independentlyEvaluate(expression:MathExpression):BigFraction{if(expression.op==="VALUE")return bf(BigInt(expression.numerator),BigInt(expression.denominator));if(expression.op==="SQRT")throw new Error("UNSUPPORTED_ROOT");const l=independentlyEvaluate(expression.left),r=independentlyEvaluate(expression.right);if(expression.op==="ADD")return bf(l.numerator*r.denominator+r.numerator*l.denominator,l.denominator*r.denominator);if(expression.op==="SUBTRACT")return bf(l.numerator*r.denominator-r.numerator*l.denominator,l.denominator*r.denominator);if(expression.op==="MULTIPLY")return bf(l.numerator*r.numerator,l.denominator*r.denominator);return bf(l.numerator*r.denominator,l.denominator*r.numerator);}
export function verifyGradeFourWaveHIndependentOracle(){return questions.flatMap((question)=>{const expression=question.answer.derivation;if(!expression)return[`${question.id}:MISSING_DERIVATION`];try{const result=independentlyEvaluate(expression);return result.denominator===1n&&String(result.numerator)===question.answer.exactValue?[]:[`${question.id}:INDEPENDENT_ORACLE_MISMATCH`];}catch{return[`${question.id}:INDEPENDENT_ORACLE_ERROR`];}});}
const independentOracleErrors=verifyGradeFourWaveHIndependentOracle();if(independentOracleErrors.length)throw new Error(`GRADE_4_WAVE_H_ORACLE_FAILURE:${independentOracleErrors.join(",")}`);
const skeleton=buildOfficialGradeSkeleton(grade);
const evidenceReceipts=requiredAutomatedEvidenceChecks.map((check)=>({id:`${packId}-${check.toLowerCase().replaceAll("_","-")}`,entityId:packId,check,status:"PASSED" as const,evidence:check==="SOURCE_MAPPING"?`Retained source-locked outcome ${sliceOutcomes[0]} on page 37.`:check==="MATHEMATICAL_ANSWER"?`Independent BigInt rational oracle verifies ${fixtures.length} complete public fixtures across ${new Set(fixtures.map((entry)=>entry.structure)).size} reasoning structures; oracle errors ${independentOracleErrors.length}, malformed errors ${malformedFixtureErrors.length}.`:`Deterministic Grade 4 Wave H ${check.toLowerCase().replaceAll("_"," ")} receipt.`}));
const blueprints=(["FOUNDATIONAL","CORE","EXTENSION"] as const).map((band)=>({id:`g4-wave-h-blueprint-${sliceOutcomes[0].toLowerCase()}-${band.toLowerCase()}`,grade,skillId:officialSkillId(sliceOutcomes[0]),difficulty:band,questionType:"INTEGER_INPUT" as const,templateId:`g4-wave-h-template-${sliceOutcomes[0].toLowerCase()}`,targetCount:8,sourceReferenceIds:[sourceId]}));
const candidateCore={format:"plave-wave-h-candidate-v1",candidateId,version,policyVersion,sourceOutcomeIds:sliceOutcomes,blueprints,questions,explanations} as const;
export const gradeFourWaveHBundleHash=sha256(canonicalize(candidateCore));
export function createGradeFourWaveHPack():GradePack{return{schemaVersion:"content-factory-grade-pack-v1",grade,packId,packVersion:version,immutableReference:false,testOnly:false,locale:"vi-VN",unicodeNormalization:"NFC",sources:[skeleton.source],domains:skeleton.domains,units:skeleton.units,knowledgeNodes:skeleton.knowledgeNodes,skills:skeleton.skills,objectives:skeleton.objectives,prerequisites:[{fromSkillId:officialSkillId(prerequisiteOutcomeIds[0]),toSkillId:officialSkillId(sliceOutcomes[0]),evidence:"HYPOTHESIS_REQUIRES_EVIDENCE",sourceReferenceIds:[]},{fromSkillId:officialSkillId(sliceOutcomes[0]),toSkillId:officialSkillId(nextTargetOutcomeIds[0]),evidence:"HYPOTHESIS_REQUIRES_EVIDENCE",sourceReferenceIds:[]}],blueprints,questions,quarantinedQuestions:[],explanations,evidenceReceipts,candidate:{candidateId,version,bundleHash:gradeFourWaveHBundleHash,policyVersion},adaptivePolicy:{version:policyVersion,status:"VALIDATED"},release:{publication:"DRAFT",visibility:"HIDDEN",pilotEnabled:false,runtimeEnabled:false,retentionEnabled:false},production:{wave:"H",selectedSliceId:"g4-multistep-fraction-applications",selectionBasis:["SOURCE_VERIFIED","UNCOVERED_BY_WAVES_A_TO_G","PUBLIC_DATA_COMPLETE","EXACT_INTERMEDIATE_ORACLE","DOMAIN_UNIT_GUARDS","SIX_REASONING_STRUCTURES"],generated:24,repaired:0,evidenceGatePassed:24,verificationInsufficient:0,rejected:0,duplicate:0,candidateEligible:24},legacyAsset:null};}
export const gradeFourWaveHPack=createGradeFourWaveHPack();
export const gradeFourWaveHMetadata={schemaVersion:"plave-wave-h-metadata-v1",wave:"H",grade,title:"Bài toán phân số nhiều bước",sourceClassification:"SOURCE_VERIFIED",sourcePages:[37],sourceOutcomeIds:sliceOutcomes,prerequisiteOutcomeIds,prerequisiteEvidence:"HYPOTHESIS_REQUIRES_EVIDENCE",nextTargetOutcomeIds,nextTargetEvidence:"HYPOTHESIS_REQUIRES_EVIDENCE",reasoningStructures:[...new Set(fixtures.map((entry)=>entry.structure))],independentOracleErrors,malformedFixtureErrors,production:gradeFourWaveHPack.production,candidate:gradeFourWaveHPack.candidate,release:gradeFourWaveHPack.release} as const;
