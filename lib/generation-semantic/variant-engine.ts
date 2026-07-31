import { createHash } from "node:crypto";

import type { Difficulty, Family, OutcomeDescriptor } from "./engine.ts";
import { classifyOutcome } from "./engine.ts";

export const OUTCOME_VARIANT_VERSION = "plave-outcome-variant-v1" as const;
export const OUTCOME_SEMANTIC_VARIANTS = [
  "PLACE_VALUE", "NUMBER_REPRESENTATION", "NUMBER_COMPARISON", "NUMBER_ORDERING",
  "ADDITION_SUBTRACTION", "MULTIPLICATION_DIVISION", "INTEGER_OPERATIONS",
  "FRACTION_RECOGNITION", "FRACTION_EQUIVALENCE", "FRACTION_COMPARISON", "FRACTION_OPERATIONS",
  "DECIMAL_REPRESENTATION", "DECIMAL_COMPARISON", "DECIMAL_OPERATIONS",
  "RATIO", "PERCENTAGE", "DIVISIBILITY", "POWER_ROOT", "NUMERICAL_EXPRESSION",
  "MISSING_VALUE", "SUBSTITUTION", "EXPRESSION_CONSTRUCTION", "LIKE_TERM_COMBINATION",
  "ALGEBRAIC_TRANSFORMATION", "EQUATION_SOLVING", "INEQUALITY_SOLVING",
  "SEQUENCE_RULE", "FUNCTION_INPUT_OUTPUT", "RELATION_INTERPRETATION",
  "DIRECT_MEASUREMENT", "UNIT_CONVERSION", "TIME_MONEY", "PERIMETER", "AREA", "VOLUME",
  "SHAPE_PROPERTIES", "ANGLE", "COORDINATE", "GEOMETRIC_CONSTRUCTION",
  "GEOMETRIC_RELATION", "THEOREM_APPLICATION", "SPATIAL_REASONING",
  "TABLE_INTERPRETATION", "CHART_INTERPRETATION", "FREQUENCY", "RELATIVE_FREQUENCY",
  "CENTRAL_TENDENCY", "DATA_COMPARISON", "EXPERIMENTAL_PROBABILITY",
  "THEORETICAL_PROBABILITY", "SAMPLE_SPACE",
  "ONE_STEP_CONTEXT", "MULTI_STEP_CONTEXT", "INFORMATION_SELECTION",
  "INSUFFICIENT_INFORMATION", "ERROR_DETECTION", "MATHEMATICAL_MODELING",
  "EXPLANATION_REASONING", "REPRESENTATION_CONSTRUCTION",
] as const;
export type Variant = typeof OUTCOME_SEMANTIC_VARIANTS[number];

type Base = { variant: Variant; family: Family; complexity: 1 | 2 | 3 };
export type VariantAst =
  | (Base & { kind:"NUMBER_STRUCTURE"; value:number; values:readonly number[]; place?:number })
  | (Base & { kind:"OPERATION"; operands:readonly number[]; operation:string })
  | (Base & { kind:"RATIONAL"; numerators:readonly number[]; denominators:readonly number[]; operation:string })
  | (Base & { kind:"ALGEBRA"; coefficient:number; constant:number; variableValue:number; relation:string })
  | (Base & { kind:"MEASURE"; values:readonly number[]; unit:string; targetUnit?:string; factor?:number; shape?:string })
  | (Base & { kind:"GEOMETRIC_RELATION"; premises:readonly string[]; requestedRelation:string; parameters:readonly number[] })
  | (Base & { kind:"DATA"; values:readonly number[]; query:string; favorable?:number; total?:number })
  | (Base & { kind:"CONTEXT"; quantities:readonly number[]; operations:readonly string[]; relevantIndexes:readonly number[] })
  | (Base & { kind:"CONCEPT"; canonicalStatement:string; concept:string; task:string });

export type OutcomeSemanticContract = {
  outcomeId:string; expectedFamily:Family; expectedVariant:Variant;
  expectedEvidenceForm:string; expectedAnswerType:string; expectedSolver:string;
  expectedVisual:string; expectedDifficultyDimensions:readonly string[];
  prerequisiteBounds:readonly string[];
};
const h=(s:string)=>createHash("sha256").update(s).digest();
const pick=(seed:string,max:number,min=1)=>h(seed).readUInt32BE(0)%max+min;
const includes=(text:string,re:RegExp)=>re.test(text);

export function solverForOutcomeVariant(expectedVariant: Variant): string {
  return /FRACTION|DECIMAL|RATIO|PERCENT/.test(expectedVariant)
    ? "RATIONAL_SOLVER_V1"
    : /EQUATION/.test(expectedVariant)
      ? "EQUATION_SOLVER_V1"
      : /INEQUALITY/.test(expectedVariant)
        ? "INEQUALITY_SOLVER_V1"
        : /GEOMET|ANGLE|PERIMETER|AREA|VOLUME/.test(expectedVariant)
          ? "GEOMETRY_SOLVER_V1"
          : /STAT|FREQUENCY|TABLE|CHART|DATA|CENTRAL/.test(expectedVariant)
            ? "STATISTICS_SOLVER_V1"
            : /PROBABILITY|SAMPLE_SPACE/.test(expectedVariant)
              ? "PROBABILITY_SOLVER_V1"
              : /MEASURE|UNIT|TIME_MONEY/.test(expectedVariant)
                ? "UNIT_CONVERSION_SOLVER_V1"
                : /CONTEXT|INFORMATION|MODELING|ERROR|EXPLANATION|REPRESENTATION/.test(expectedVariant)
                  ? "STRUCTURED_WORD_PROBLEM_SOLVER_V1"
                  : "INTEGER_ARITHMETIC_SOLVER_V1";
}

export function deriveVariant(outcome:OutcomeDescriptor):Variant {
  const t=`${outcome.subdomain} ${outcome.description}`.toLowerCase();
  if(includes(t,/không đủ|thiếu dữ kiện/)) return "INSUFFICIENT_INFORMATION";
  if(includes(t,/sai|sửa lỗi|phát hiện lỗi/)) return "ERROR_DETECTION";
  if(includes(t,/lựa chọn.*thông tin|dữ kiện cần/)) return "INFORMATION_SELECTION";
  if(includes(t,/mô hình hoá|mô hình hóa|thiết lập.*mô hình/)) return "MATHEMATICAL_MODELING";
  if(includes(t,/không gian mẫu/)) return "SAMPLE_SPACE";
  if(includes(t,/thực nghiệm|thí nghiệm lặp/)) return "EXPERIMENTAL_PROBABILITY";
  if(includes(t,/xác suất|biến cố|ngẫu nhiên|khả năng/)) return "THEORETICAL_PROBABILITY";
  if(includes(t,/tần số tương đối|tần suất/)) return "RELATIVE_FREQUENCY";
  if(includes(t,/tần số/)) return "FREQUENCY";
  if(includes(t,/trung bình|trung vị|mốt/)) return "CENTRAL_TENDENCY";
  if(includes(t,/biểu đồ/)) return "CHART_INTERPRETATION";
  if(includes(t,/bảng|dữ liệu/)) return includes(t,/so sánh|nhận xét/)?"DATA_COMPARISON":"TABLE_INTERPRETATION";
  if(includes(t,/tọa độ/)) return "COORDINATE";
  if(includes(t,/vị trí|định hướng không gian|trên hoặc dưới|cao hơn|thấp hơn/)) return "SPATIAL_REASONING";
  if(includes(t,/thales|pythagore|định lí|hệ thức|tiếp tuyến|lượng giác/)) return "THEOREM_APPLICATION";
  if(includes(t,/vẽ|dựng|lắp ghép/)) return "GEOMETRIC_CONSTRUCTION";
  if(includes(t,/song song|vuông góc|thẳng hàng|nằm giữa|quan hệ.*hình/)) return "GEOMETRIC_RELATION";
  if(includes(t,/góc/)) return "ANGLE";
  if(includes(t,/thể tích|khối.*lập phương|lăng trụ|hình chóp/)) return "VOLUME";
  if(includes(t,/diện tích/)) return "AREA";
  if(includes(t,/chu vi/)) return "PERIMETER";
  if(includes(t,/đổi.*đơn vị|chuyển đổi|mối quan hệ.*đơn vị/)) return "UNIT_CONVERSION";
  if(includes(t,/giờ|phút|ngày|tháng|tiền|đồng hồ|mua bán/)) return "TIME_MONEY";
  if(includes(t,/đo|độ dài|khối lượng|dung tích/)) return "DIRECT_MEASUREMENT";
  if(includes(t,/hình|tam giác|tứ giác|đa giác|đường tròn|điểm|đường thẳng|tia|đoạn thẳng/)) return "SHAPE_PROPERTIES";
  if(includes(t,/bất phương trình/)) return "INEQUALITY_SOLVING";
  if(includes(t,/phương trình/)) return "EQUATION_SOLVING";
  if(includes(t,/hàm số|giá trị.*hàm/)) return "FUNCTION_INPUT_OUTPUT";
  if(includes(t,/đồ thị|quan hệ.*đại lượng/)) return "RELATION_INTERPRETATION";
  if(includes(t,/dãy|quy luật|mẫu/)) return "SEQUENCE_RULE";
  if(includes(t,/thay.*giá trị|giá trị.*biểu thức/)) return "SUBSTITUTION";
  if(includes(t,/thu gọn.*(?:đơn thức|đa thức)|hạng tử đồng dạng/)) return "LIKE_TERM_COMBINATION";
  if(includes(t,/biến đổi|rút gọn|đồng dạng|hằng đẳng thức/)) return "ALGEBRAIC_TRANSFORMATION";
  if(includes(t,/lập.*biểu thức|biểu diễn.*biểu thức/)) return "EXPRESSION_CONSTRUCTION";
  if(includes(t,/thành phần chưa biết|tìm.*số|tìm.*ẩn/)) return "MISSING_VALUE";
  if(includes(t,/biểu thức|đa thức|đơn thức/)) return "NUMERICAL_EXPRESSION";
  if(includes(t,/căn bậc|lũy thừa/)) return "POWER_ROOT";
  if(includes(t,/chia hết|ước|bội|nguyên tố/)) return "DIVISIBILITY";
  if(includes(t,/phần trăm/)) return "PERCENTAGE";
  if(includes(t,/tỉ số|tỉ lệ/)) return "RATIO";
  if(includes(t,/phân số|hữu tỉ/)) {
    if(includes(t,/tương đương|bằng nhau|quy đồng|rút gọn/)) return "FRACTION_EQUIVALENCE";
    if(includes(t,/so sánh|thứ tự/)) return "FRACTION_COMPARISON";
    if(includes(t,/cộng|trừ|nhân|chia|tính/)) return "FRACTION_OPERATIONS";
    return "FRACTION_RECOGNITION";
  }
  if(includes(t,/thập phân/)) {
    if(includes(t,/so sánh|thứ tự/)) return "DECIMAL_COMPARISON";
    if(includes(t,/cộng|trừ|nhân|chia|tính/)) return "DECIMAL_OPERATIONS";
    return "DECIMAL_REPRESENTATION";
  }
  if(includes(t,/hàng|cấu tạo.*số|phân tích.*số/)) return "PLACE_VALUE";
  if(includes(t,/biểu diễn|đọc|viết.*số/)) return "NUMBER_REPRESENTATION";
  if(includes(t,/sắp xếp|thứ tự/)) return "NUMBER_ORDERING";
  if(includes(t,/so sánh|lớn nhất|bé nhất/)) return "NUMBER_COMPARISON";
  if(includes(t,/nhân|chia/)) return "MULTIPLICATION_DIVISION";
  if(includes(t,/số nguyên|âm|dương/)) return "INTEGER_OPERATIONS";
  if(includes(t,/cộng|trừ|tính nhẩm/)) return "ADDITION_SUBTRACTION";
  if(includes(t,/nhiều bước|hai bước/)) return "MULTI_STEP_CONTEXT";
  if(includes(t,/giải quyết|bài toán|thực tiễn|vận dụng/)) return "ONE_STEP_CONTEXT";
  if(includes(t,/lựa chọn|tạo lập|biểu diễn/)) return "REPRESENTATION_CONSTRUCTION";
  if(includes(t,/giải thích|lí giải|chứng minh|nhận biết|mô tả|nêu|làm quen|sử dụng|thực hiện/)) return "EXPLANATION_REASONING";
  throw new Error(`OUTCOME_SEMANTIC_UNREADABLE:${outcome.id}`);
}

export function buildOutcomeSemanticContract(outcome:OutcomeDescriptor):OutcomeSemanticContract {
  const expectedFamily=classifyOutcome(outcome), expectedVariant=deriveVariant(outcome);
  const visual=/PLACE_VALUE|MEASUREMENT|PERIMETER|AREA|VOLUME|SHAPE|ANGLE|COORDINATE|CHART|TABLE/.test(expectedVariant)?expectedVariant:"NONE";
  const solver=solverForOutcomeVariant(expectedVariant);
  return {outcomeId:outcome.id,expectedFamily,expectedVariant,expectedEvidenceForm:expectedVariant.toLowerCase().replaceAll("_","-"),expectedAnswerType:"SINGLE_CHOICE",expectedSolver:solver,expectedVisual:visual,expectedDifficultyDimensions:["complexity","operand-or-premise-count","representation-depth"],prerequisiteBounds:[`schoolGrade=${outcome.grade}`]};
}

export function generateVariantAst(contract:OutcomeSemanticContract,description:string,grade:number,difficulty:Difficulty,seed:string):VariantAst {
  const complexity=(difficulty==="EASY"?1:difficulty==="MEDIUM"?2:3) as 1|2|3;
  const max=(grade+1)*10*complexity, a=pick(seed+"a",max),b=pick(seed+"b",Math.max(3,max/2));
  const v=contract.expectedVariant,f=contract.expectedFamily;
  if(/PLACE_VALUE|NUMBER_REPRESENTATION|NUMBER_COMPARISON|NUMBER_ORDERING|SEQUENCE_RULE/.test(v)) return {kind:"NUMBER_STRUCTURE",variant:v,family:f,complexity,value:a*10+b,values:Array.from({length:complexity+2},(_,i)=>a+i*b),place:10**Math.min(complexity,3)};
  if(/FRACTION/.test(v)) return {kind:"RATIONAL",variant:v,family:f,complexity,numerators:[a%9+1,b%9+1],denominators:[a%8+2,b%8+2],operation:v};
  if(/DECIMAL|RATIO|PERCENT/.test(v)) return {kind:"RATIONAL",variant:v,family:f,complexity,numerators:[a,b],denominators:[10**complexity,100],operation:v};
  if(/MISSING|SUBSTITUTION|EXPRESSION|LIKE_TERM|ALGEBRA|EQUATION|INEQUALITY|FUNCTION|RELATION/.test(v)) return {kind:"ALGEBRA",variant:v,family:f,complexity,coefficient:complexity+1,constant:b,variableValue:a,relation:v};
  if(/MEASUREMENT|UNIT|TIME_MONEY|PERIMETER|AREA|VOLUME/.test(v)) return {kind:"MEASURE",variant:v,family:f,complexity,values:[a,b,complexity+1],unit:"cm",targetUnit:v==="UNIT_CONVERSION"?"mm":undefined,factor:v==="UNIT_CONVERSION"?10:undefined,shape:/PERIMETER|AREA|VOLUME/.test(v)?"RECTANGULAR":undefined};
  if(/SHAPE|ANGLE|COORDINATE|GEOMETRIC|THEOREM|SPATIAL/.test(v)) return {kind:"GEOMETRIC_RELATION",variant:v,family:f,complexity,premises:[`A=${a}`,`B=${b}`,description],requestedRelation:v,parameters:[a,b,complexity]};
  if(/TABLE|CHART|FREQUENCY|CENTRAL|DATA|PROBABILITY|SAMPLE_SPACE/.test(v)) return {kind:"DATA",variant:v,family:f,complexity,values:Array.from({length:complexity*2+3},(_,i)=>(i+a)%9+1),query:v,favorable:/PROBABILITY|SAMPLE_SPACE/.test(v)?complexity:undefined,total:/PROBABILITY|SAMPLE_SPACE/.test(v)?complexity*2+2:undefined};
  if(/CONTEXT|INFORMATION|ERROR|MODELING/.test(v)) return {kind:"CONTEXT",variant:v,family:f,complexity,quantities:[a,b,complexity*3],operations:Array.from({length:complexity},(_,i)=>i%2?"+":"×"),relevantIndexes:v==="INFORMATION_SELECTION"?[0,1]:[0,1,2]};
  if(/DIVISIBILITY|POWER_ROOT|NUMERICAL_EXPRESSION|ADDITION|MULTIPLICATION|INTEGER/.test(v)) return {kind:"OPERATION",variant:v,family:f,complexity,operands:Array.from({length:complexity+1},(_,i)=>a+i+b),operation:v};
  if(/EXPLANATION|REPRESENTATION|DIRECT_MEASUREMENT/.test(v)) return {kind:"CONCEPT",variant:v,family:f,complexity,canonicalStatement:description,concept:description,task:v};
  throw new Error(`GENERATOR_FAMILY_NOT_IMPLEMENTED:${v}`);
}

export function validateOutcomeSemanticAlignment(contract:OutcomeSemanticContract,ast:VariantAst,solverReceipt:{variant:Variant;solver:string}) {
  if(ast.variant!==contract.expectedVariant) return {ok:false as const,code:"OUTCOME_VARIANT_MISMATCH"};
  if(ast.family!==contract.expectedFamily) return {ok:false as const,code:"OUTCOME_FAMILY_MISMATCH"};
  if(solverReceipt.variant!==ast.variant||solverReceipt.solver!==contract.expectedSolver) return {ok:false as const,code:"OUTCOME_SOLVER_MISMATCH"};
  if(ast.variant==="NUMBER_ORDERING"&&(ast.kind!=="NUMBER_STRUCTURE"||ast.values.length<3)) return {ok:false as const,code:"ORDERING_AST_INVALID"};
  if(ast.variant==="FRACTION_EQUIVALENCE"&&ast.kind!=="RATIONAL") return {ok:false as const,code:"FRACTION_AST_INVALID"};
  if(ast.variant==="EQUATION_SOLVING"&&ast.kind!=="ALGEBRA") return {ok:false as const,code:"EQUATION_AST_INVALID"};
  if(/TABLE|CHART|FREQUENCY|CENTRAL|DATA/.test(ast.variant)&&ast.kind!=="DATA") return {ok:false as const,code:"STATISTICS_AST_INVALID"};
  if(/PROBABILITY|SAMPLE_SPACE/.test(ast.variant)&&(ast.kind!=="DATA"||!ast.total)) return {ok:false as const,code:"PROBABILITY_AST_INVALID"};
  if(/INFORMATION|MODELING|ERROR/.test(ast.variant)&&ast.kind!=="CONTEXT") return {ok:false as const,code:"REASONING_AST_INVALID"};
  return {ok:true as const};
}

export function solveVariantAst(contract:OutcomeSemanticContract,ast:VariantAst) {
  let result:string;
  switch(ast.kind){
    case "NUMBER_STRUCTURE":
      result=ast.variant==="NUMBER_ORDERING"?[...ast.values].sort((a,b)=>a-b).join("; "):ast.variant==="NUMBER_COMPARISON"?String(Math.max(...ast.values)):ast.variant==="PLACE_VALUE"?String(Math.floor(ast.value/(ast.place??1))%10):String(ast.value);
      break;
    case "OPERATION":
      result=ast.variant==="MULTIPLICATION_DIVISION"?String(ast.operands.reduce((a,b)=>a*b,1)):ast.variant==="DIVISIBILITY"?String(ast.operands[0]%(ast.operands[1]??1)===0):ast.variant==="POWER_ROOT"?String(ast.operands[0]**Math.min(ast.complexity,3)):String(ast.operands.reduce((a,b)=>a+b,0));
      break;
    case "RATIONAL": {
      const first=ast.numerators[0]/ast.denominators[0],second=ast.numerators[1]/ast.denominators[1];
      result=ast.variant.includes("COMPARISON")?(first===second?"=":first>second?">":"<"):ast.variant==="PERCENTAGE"?String(first*100):String(Number((first+second).toFixed(4)));
      break;
    }
    case "ALGEBRA":
      result=ast.variant==="EQUATION_SOLVING"||ast.variant==="MISSING_VALUE"?String(ast.variableValue):ast.variant==="INEQUALITY_SOLVING"?`x > ${ast.variableValue}`:String(ast.coefficient*ast.variableValue+ast.constant);
      break;
    case "MEASURE": {
      const [a,b,c]=ast.values;
      result=ast.variant==="UNIT_CONVERSION"?String(a*(ast.factor??1)):ast.variant==="PERIMETER"?String(2*(a+b)):ast.variant==="AREA"?String(a*b):ast.variant==="VOLUME"?String(a*b*c):String(a);
      break;
    }
    case "GEOMETRIC_RELATION":
      result=ast.variant==="COORDINATE"?`(${ast.parameters[0]}; ${ast.parameters[1]})`:ast.requestedRelation;
      break;
    case "DATA": {
      const sorted=[...ast.values].sort((a,b)=>a-b);
      result=/PROBABILITY/.test(ast.variant)?`${ast.favorable}/${ast.total}`:ast.variant==="CENTRAL_TENDENCY"?String(sorted.reduce((a,b)=>a+b,0)/sorted.length):ast.variant==="FREQUENCY"?String(ast.values.filter(v=>v===ast.values[0]).length):String(Math.max(...ast.values));
      break;
    }
    case "CONTEXT":
      result=ast.variant==="INFORMATION_SELECTION"?ast.relevantIndexes.join(","):String(ast.quantities.slice(0,ast.complexity+1).reduce((a,b)=>a+b,0));
      break;
    case "CONCEPT":
      result=ast.canonicalStatement;
      break;
  }
  const normalizedInputs=JSON.stringify(ast);
  return {solverId:contract.expectedSolver,solverVersion:"1",variant:ast.variant,normalizedInputs,derivedResult:result,uniquenessPolicy:"EXACTLY_ONE",validationHash:createHash("sha256").update(`${contract.expectedSolver}:${normalizedInputs}:${result}`).digest("hex")};
}

export function renderVariantPrompt(ast:VariantAst):string {
  switch(ast.kind){
    case "NUMBER_STRUCTURE":
      if(ast.variant==="NUMBER_ORDERING") return `Sắp xếp các số ${ast.values.join(", ")} theo thứ tự tăng dần.`;
      if(ast.variant==="NUMBER_COMPARISON") return `Số nào lớn nhất trong các số ${ast.values.join(", ")}?`;
      if(ast.variant==="PLACE_VALUE") return `Trong số ${ast.value}, chữ số ở hàng ${ast.place} là chữ số nào?`;
      return `Biểu diễn số ${ast.value} bằng cách viết số thích hợp.`;
    case "OPERATION": return `Thực hiện yêu cầu ${ast.variant.toLowerCase().replaceAll("_"," ")} với các số ${ast.operands.join(", ")}.`;
    case "RATIONAL": return `Thực hiện yêu cầu ${ast.variant.toLowerCase().replaceAll("_"," ")} với ${ast.numerators[0]}/${ast.denominators[0]} và ${ast.numerators[1]}/${ast.denominators[1]}.`;
    case "ALGEBRA": return ast.variant==="EQUATION_SOLVING"?`Giải phương trình ${ast.coefficient}x + ${ast.constant} = ${ast.coefficient*ast.variableValue+ast.constant}.`:`Thực hiện ${ast.variant.toLowerCase().replaceAll("_"," ")} với biểu thức ${ast.coefficient}x + ${ast.constant}, x = ${ast.variableValue}.`;
    case "MEASURE": return `Thực hiện ${ast.variant.toLowerCase().replaceAll("_"," ")} với các số đo ${ast.values.join(", ")} ${ast.unit}.`;
    case "GEOMETRIC_RELATION": return `Dựa vào các giả thiết ${ast.premises.join("; ")}, hãy xác định ${ast.requestedRelation.toLowerCase().replaceAll("_"," ")}.`;
    case "DATA": return `Cho dữ liệu ${ast.values.join(", ")}. Hãy thực hiện ${ast.query.toLowerCase().replaceAll("_"," ")}.`;
    case "CONTEXT": return `Một tình huống có các đại lượng ${ast.quantities.join(", ")}. Hãy thực hiện ${ast.variant.toLowerCase().replaceAll("_"," ")}.`;
    case "CONCEPT": return `Chọn phát biểu đúng cho yêu cầu: ${ast.concept}`;
  }
}
