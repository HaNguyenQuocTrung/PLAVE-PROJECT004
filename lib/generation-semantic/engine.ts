import { createHash } from "node:crypto";

export const SEMANTIC_GENERATOR_VERSION = "plave-semantic-generator-v1" as const;
export type Difficulty = "EASY" | "MEDIUM" | "HARD";
export type Family = "INTEGER_ARITHMETIC" | "FRACTION" | "DECIMAL" | "RATIO_PERCENT" | "DIVISIBILITY" | "POWER_ROOT" | "EXPRESSION" | "EQUATION" | "INEQUALITY" | "FUNCTION" | "MEASUREMENT" | "GEOMETRY" | "COORDINATE" | "STATISTICS" | "PROBABILITY" | "WORD_PROBLEM";
type Base = { family: Family; complexity: number };
export type ProblemAst =
  | (Base & { family:"INTEGER_ARITHMETIC"; a:number;b:number;op:"+"|"-"|"×" })
  | (Base & { family:"FRACTION"; numerator:number;denominator:number })
  | (Base & { family:"DECIMAL"; a:number;b:number })
  | (Base & { family:"RATIO_PERCENT"; whole:number;percent:number })
  | (Base & { family:"DIVISIBILITY"; value:number;divisor:number })
  | (Base & { family:"POWER_ROOT"; base:number;exponent:number })
  | (Base & { family:"EXPRESSION"; x:number;coefficient:number;constant:number })
  | (Base & { family:"EQUATION"; coefficient:number;solution:number;constant:number })
  | (Base & { family:"INEQUALITY"; boundary:number;direction:">"|"<" })
  | (Base & { family:"FUNCTION"; x:number;slope:number;intercept:number })
  | (Base & { family:"MEASUREMENT"; value:number;factor:number;from:"m"|"kg"|"h";to:"cm"|"g"|"phút" })
  | (Base & { family:"GEOMETRY"; width:number;height:number;operation:"AREA"|"PERIMETER" })
  | (Base & { family:"COORDINATE"; x1:number;y1:number;x2:number;y2:number })
  | (Base & { family:"STATISTICS"; data:readonly number[];statistic:"MEAN"|"MEDIAN" })
  | (Base & { family:"PROBABILITY"; favorable:number;total:number })
  | (Base & { family:"WORD_PROBLEM"; initial:number;change:number;steps:1|2 });

export type OutcomeDescriptor = { id:string;grade:number;strand:string;subdomain:string;description:string };
const digest=(s:string)=>createHash("sha256").update(s).digest();
const seeded=(seed:string,n:number,min=1)=>digest(seed).readUInt32BE(0)%n+min;

export function classifyOutcome(outcome:OutcomeDescriptor):Family {
  const text=`${outcome.subdomain} ${outcome.description}`.toLowerCase();
  if(/xác suất|ngẫu nhiên|biến cố|khả năng/.test(text)) return "PROBABILITY";
  if(/thống kê|dữ liệu|biểu đồ|tần số|trung bình|trung vị/.test(text)) return "STATISTICS";
  if(/tọa độ|trục tọa/.test(text)) return "COORDINATE";
  if(/đo|độ dài|khối lượng|thời gian|tiền|đơn vị|dung tích/.test(text)) return "MEASUREMENT";
  if(/hình|góc|tam giác|tứ giác|đa giác|đường tròn|chu vi|diện tích|thể tích|thales|tiếp tuyến|lượng giác/.test(text)) return "GEOMETRY";
  if(/bất phương trình/.test(text)) return "INEQUALITY";
  if(/phương trình|tìm.*ẩn/.test(text)) return "EQUATION";
  if(/hàm số|hệ số góc|quan hệ/.test(text)) return "FUNCTION";
  if(/biểu thức|đa thức|đơn thức|hằng đẳng thức/.test(text)) return "EXPRESSION";
  if(/lũy thừa|căn bậc/.test(text)) return "POWER_ROOT";
  if(/chia hết|ước|bội|số nguyên tố/.test(text)) return "DIVISIBILITY";
  if(/tỉ số|phần trăm|tỉ lệ/.test(text)) return "RATIO_PERCENT";
  if(/thập phân/.test(text)) return "DECIMAL";
  if(/phân số|hữu tỉ/.test(text)) return "FRACTION";
  if(/thực hành|trải nghiệm|giải quyết|thực tiễn|bài toán|mô hình/.test(text)||outcome.strand.includes("THỰC HÀNH")) return "WORD_PROBLEM";
  if(outcome.strand.includes("HÌNH HỌC")) return "GEOMETRY";
  if(outcome.strand.includes("THỐNG KÊ")) return "STATISTICS";
  if(outcome.strand.includes("SỐ")) return "INTEGER_ARITHMETIC";
  throw new Error("GENERATOR_FAMILY_NOT_IMPLEMENTED");
}

export function generateAst(family:Family,grade:number,difficulty:Difficulty,seed:string):ProblemAst {
  const complexity=difficulty==="EASY"?1:difficulty==="MEDIUM"?2:3;
  const scale=Math.max(5,(grade+1)*10*complexity), a=seeded(seed+"a",scale), b=seeded(seed+"b",Math.max(3,scale/2));
  switch(family){
    case "INTEGER_ARITHMETIC": return {family,complexity,a,b,op:complexity===1?"+":complexity===2?"-":"×"};
    case "FRACTION": return {family,complexity,numerator:seeded(seed,8),denominator:seeded(seed+"d",8,2)};
    case "DECIMAL": return {family,complexity,a:a/10**complexity,b:b/10**complexity};
    case "RATIO_PERCENT": return {family,complexity,whole:10*seeded(seed,20),percent:[10,20,25,50][seeded(seed+"p",4)-1]};
    case "DIVISIBILITY": return {family,complexity,value:a*b,divisor:b};
    case "POWER_ROOT": return {family,complexity,base:seeded(seed,8,2),exponent:complexity===3?3:2};
    case "EXPRESSION": return {family,complexity,x:a,coefficient:complexity+1,constant:b};
    case "EQUATION": return {family,complexity,coefficient:complexity+1,solution:a,constant:b};
    case "INEQUALITY": return {family,complexity,boundary:a,direction:seeded(seed,2)===1?">":"<"};
    case "FUNCTION": return {family,complexity,x:a,slope:complexity+1,intercept:b};
    case "MEASUREMENT": {const modes=[["m","cm",100],["kg","g",1000],["h","phút",60]] as const; const m=modes[seeded(seed,3)-1]; return {family,complexity,value:seeded(seed+"v",20),from:m[0],to:m[1],factor:m[2]};}
    case "GEOMETRY": return {family,complexity,width:a,height:b,operation:complexity===1?"PERIMETER":"AREA"};
    case "COORDINATE": return {family,complexity,x1:a,y1:b,x2:a+complexity,y2:b+complexity};
    case "STATISTICS": return {family,complexity,data:Array.from({length:complexity*2+1},(_,i)=>i+1),statistic:complexity===1?"MEDIAN":"MEAN"};
    case "PROBABILITY": {const total=complexity*2+2;return {family,complexity,favorable:complexity,total};}
    case "WORD_PROBLEM": return {family,complexity,initial:a,change:b,steps:complexity===1?1:2};
  }
}

export function solveAst(ast:ProblemAst):{answer:string;solver:string}{
  switch(ast.family){
    case "INTEGER_ARITHMETIC": return {answer:String(ast.op==="+"?ast.a+ast.b:ast.op==="-"?ast.a-ast.b:ast.a*ast.b),solver:"INTEGER_ARITHMETIC_SOLVER_V1"};
    case "FRACTION": {const g=(a:number,b:number):number=>b?g(b,a%b):a,d=g(ast.numerator,ast.denominator);return {answer:`${ast.numerator/d}/${ast.denominator/d}`,solver:"RATIONAL_SOLVER_V1"};}
    case "DECIMAL": return {answer:String(Number((ast.a+ast.b).toFixed(ast.complexity))),solver:"RATIONAL_SOLVER_V1"};
    case "RATIO_PERCENT": return {answer:String(ast.whole*ast.percent/100),solver:"RATIONAL_SOLVER_V1"};
    case "DIVISIBILITY": return {answer:String(ast.value/ast.divisor),solver:"INTEGER_ARITHMETIC_SOLVER_V1"};
    case "POWER_ROOT": return {answer:String(ast.base**ast.exponent),solver:"INTEGER_ARITHMETIC_SOLVER_V1"};
    case "EXPRESSION": return {answer:String(ast.coefficient*ast.x+ast.constant),solver:"ALGEBRAIC_EQUIVALENCE_SOLVER_V1"};
    case "EQUATION": return {answer:String(ast.solution),solver:"EQUATION_SOLVER_V1"};
    case "INEQUALITY": return {answer:`x ${ast.direction} ${ast.boundary}`,solver:"INEQUALITY_SOLVER_V1"};
    case "FUNCTION": return {answer:String(ast.slope*ast.x+ast.intercept),solver:"ALGEBRAIC_EQUIVALENCE_SOLVER_V1"};
    case "MEASUREMENT": return {answer:`${ast.value*ast.factor} ${ast.to}`,solver:"UNIT_CONVERSION_SOLVER_V1"};
    case "GEOMETRY": return {answer:String(ast.operation==="AREA"?ast.width*ast.height:2*(ast.width+ast.height)),solver:"GEOMETRY_SOLVER_V1"};
    case "COORDINATE": return {answer:`(${ast.x2-ast.x1}; ${ast.y2-ast.y1})`,solver:"COORDINATE_SOLVER_V1"};
    case "STATISTICS": {const s=[...ast.data].sort((a,b)=>a-b);return {answer:String(ast.statistic==="MEDIAN"?s[Math.floor(s.length/2)]:s.reduce((a,b)=>a+b,0)/s.length),solver:"STATISTICS_SOLVER_V1"};}
    case "PROBABILITY": return {answer:`${ast.favorable}/${ast.total}`,solver:"PROBABILITY_SOLVER_V1"};
    case "WORD_PROBLEM": return {answer:String(ast.initial+ast.change*(ast.steps===2?2:1)),solver:"STRUCTURED_WORD_PROBLEM_SOLVER_V1"};
  }
}

export function renderPrompt(ast:ProblemAst):string {
  switch(ast.family){
    case "INTEGER_ARITHMETIC": return `Tính ${ast.a} ${ast.op} ${ast.b}.`;
    case "FRACTION": return `Rút gọn phân số ${ast.numerator}/${ast.denominator}.`;
    case "DECIMAL": return `Tính ${ast.a} + ${ast.b}.`;
    case "RATIO_PERCENT": return `Tính ${ast.percent}% của ${ast.whole}.`;
    case "DIVISIBILITY": return `${ast.value} chia cho ${ast.divisor} được bao nhiêu?`;
    case "POWER_ROOT": return `Tính giá trị của ${ast.base}^${ast.exponent}.`;
    case "EXPRESSION": return `Tính giá trị ${ast.coefficient}x + ${ast.constant} khi x = ${ast.x}.`;
    case "EQUATION": return `Giải phương trình ${ast.coefficient}x + ${ast.constant} = ${ast.coefficient*ast.solution+ast.constant}.`;
    case "INEQUALITY": return `Chọn mô tả đúng cho các số x ${ast.direction} ${ast.boundary}.`;
    case "FUNCTION": return `Cho y = ${ast.slope}x + ${ast.intercept}. Tính y khi x = ${ast.x}.`;
    case "MEASUREMENT": return `Đổi ${ast.value} ${ast.from} sang ${ast.to}.`;
    case "GEOMETRY": return `Hình chữ nhật dài ${ast.width} cm, rộng ${ast.height} cm. Tính ${ast.operation==="AREA"?"diện tích":"chu vi"}.`;
    case "COORDINATE": return `Từ A(${ast.x1}; ${ast.y1}) đến B(${ast.x2}; ${ast.y2}), vectơ dịch chuyển là gì?`;
    case "STATISTICS": return `Dữ liệu: ${ast.data.join(", ")}. Tính ${ast.statistic==="MEAN"?"số trung bình":"trung vị"}.`;
    case "PROBABILITY": return `Một phép thử có ${ast.total} kết quả đồng khả năng, ${ast.favorable} kết quả thuận lợi. Xác suất là bao nhiêu?`;
    case "WORD_PROBLEM": return `Lan có ${ast.initial} quyển vở và nhận thêm ${ast.change}${ast.steps===2?` quyển hai lần`:" quyển"}. Lan có tất cả bao nhiêu quyển?`;
  }
}

export function validateSemantic(ast:ProblemAst,declared:Family,answer:string){
  if(ast.family!==declared) return {ok:false as const,code:"SEMANTIC_FAMILY_MISMATCH"};
  const solved=solveAst(ast); if(solved.answer!==answer) return {ok:false as const,code:"INDEPENDENT_SOLVER_MISMATCH"};
  return {ok:true as const,solver:solved.solver};
}
