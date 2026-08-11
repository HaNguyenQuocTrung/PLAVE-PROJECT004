import { normalizedDefinition } from "./canonical.ts";
import { waveKClassificationDecisionsGrades7To9 } from "./wave-k-classifications-g7-g9.ts";
import { createOfficialSourceMap } from "./official-source-map.ts";
import type { WaveKCaseSeed } from "./wave-k-types.ts";

type Payload = WaveKCaseSeed["oracle"]["payload"];

const objectiveByOutcome = new Map(
  ([7, 8, 9] as const).flatMap((grade) =>
    createOfficialSourceMap(grade).map((row) => [row.officialOutcomeId, row.learningObjective] as const),
  ),
);

function keyOf(value: string) {
  return [...value].reduce((sum, character, index) => sum + character.codePointAt(0)! * (index + 1), 0);
}

function rotatedOptions(answer: string, alternatives: readonly string[], rotation: number) {
  const unique = [...new Set([answer, ...alternatives].map((entry) => entry.normalize("NFC")))];
  if (unique.length < 4) throw new Error("WAVE_K_OPTION_POOL_NOT_UNIQUE");
  const four = unique.slice(0, 4);
  const offset = rotation % four.length;
  return [...four.slice(offset), ...four.slice(0, offset)];
}

function numericOptions(answer: number, ordinal: number) {
  return rotatedOptions(String(answer), [String(answer + 1), String(answer - 1), String(answer + 2), String(answer - 2)], ordinal);
}

function gcd(left: number, right: number): number {
  let a = Math.abs(left), b = Math.abs(right);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

function fraction(numerator: number, denominator: number) {
  const divisor = gcd(numerator, denominator);
  return `${numerator / divisor}/${denominator / divisor}`;
}

function baseSeed(
  outcomeId: string,
  grade: 7 | 8 | 9,
  ordinal: number,
  structureTag: string,
  prompt: string,
  exactAnswer: string,
  options: readonly string[],
  kind: string,
  payload: Payload,
  explanationSteps: readonly string[],
): WaveKCaseSeed {
  return {
    outcomeId,
    grade,
    ordinal,
    structureTag,
    difficulty: ordinal === 1 || ordinal === 4 ? "FOUNDATIONAL" : "CORE",
    answerType: "SINGLE_CHOICE",
    prompt: prompt.normalize("NFC"),
    options: options.map((entry) => entry.normalize("NFC")),
    exactAnswer: exactAnswer.normalize("NFC"),
    explanationSteps: explanationSteps.map((entry) => entry.normalize("NFC")),
    oracle: { kind, payload },
  };
}

function context(outcomeId: string) {
  const objective = objectiveByOutcome.get(outcomeId);
  if (!objective) throw new Error(`WAVE_K_OBJECTIVE_MISSING:${outcomeId}`);
  return `Để kiểm tra yêu cầu “${objective}”,`;
}

function dataCase(outcomeId: string, grade: 7 | 8 | 9, ordinal: number, family: string): WaveKCaseSeed {
  const key = keyOf(outcomeId) + ordinal * 17;
  const target = 1 + key % 5;
  const count = 2 + ordinal % 3;
  const values = Array.from({ length: 9 }, (_, index) => index < count ? target : 6 + ((key + index * 3) % 7));
  const answer = values.filter((value) => value === target).length;
  if (ordinal > 3) {
    const inverseAnswer = values.length - answer;
    return baseSeed(outcomeId, grade, ordinal, `${family}:non-target-count-${ordinal - 3}`,
      `${context(outcomeId)} xét dãy dữ liệu công khai ${values.join(", ")}. Có bao nhiêu giá trị khác ${target}?`,
      String(inverseAnswer), numericOptions(inverseAnswer, ordinal), "DATA_NON_TARGET_COUNT", { values, target },
      [`Dãy có ${values.length} giá trị và ${answer} giá trị bằng ${target}.`, `Số giá trị khác ${target} là ${values.length} - ${answer} = ${inverseAnswer}.`]);
  }
  return baseSeed(outcomeId, grade, ordinal, `${family}:frequency-${ordinal}`,
    `${context(outcomeId)} xét dãy dữ liệu công khai ${values.join(", ")}. Tần số của giá trị ${target} là bao nhiêu?`,
    String(answer), numericOptions(answer, ordinal), "DATA_FREQUENCY", { values, target },
    [`Đếm đúng các phần tử bằng ${target}.`, `Có ${answer} phần tử như vậy nên tần số là ${answer}.`]);
}

function proportionCase(outcomeId: string, grade: 7 | 8 | 9, ordinal: number, family: string): WaveKCaseSeed {
  const key = keyOf(outcomeId) + ordinal * 19;
  const a = 2 + key % 5;
  const scale = 2 + ordinal % 4;
  const b = a * scale;
  const c = a * (3 + key % 4);
  const answer = b * c / a;
  const thalesContext = /thales/iu.test(family)
    ? `Trong tam giác ABC, D thuộc AB, E thuộc AC và DE song song BC; AD/AB = ${a}/${b}, AC = ${c}, đặt AE = x.`
    : /angle-bisector-theorem/iu.test(family)
      ? `Trong tam giác ABC, AD là phân giác trong; AB/AC = ${a}/${b}, DC = ${c}, đặt BD = x.`
      : `Xét tỉ lệ thức ${a}/${b} = ${c}/x.`;
  if (ordinal > 3) {
    const inverseContext = /thales/iu.test(family)
      ? `Trong tam giác ABC, D thuộc AB, E thuộc AC và DE song song BC; AD/AB = ${a}/${b}, AE = ${c}, đặt AC = x.`
      : /angle-bisector-theorem/iu.test(family)
        ? `Trong tam giác ABC, AD là phân giác trong; AB/AC = ${a}/${b}, BD = ${c}, đặt DC = x.`
        : `Xét tỉ lệ thức ${a}/${b} = ${c}/x.`;
    return baseSeed(outcomeId, grade, ordinal, `${family}:inverse-length-${ordinal - 3}`,
      `${context(outcomeId)} ${inverseContext} Giá trị x bằng bao nhiêu?`,
      String(answer), numericOptions(answer, ordinal), "PROPORTION_FOURTH", { a, b, c },
      [`Dùng tính chất hai tỉ số tương ứng bằng nhau.`, `x = (${b} × ${c})/${a} = ${answer}.`]);
  }
  return baseSeed(outcomeId, grade, ordinal, `${family}:proportion-${(ordinal - 1) % 3 + 1}`,
    `${context(outcomeId)} ${thalesContext} Giá trị chính xác của x là bao nhiêu?`,
    String(answer), numericOptions(answer, ordinal), "PROPORTION_FOURTH", { a, b, c },
    [`Từ ${a}/${b} = ${c}/x suy ra ${a}x = ${b} × ${c}.`, `Vậy x = (${b} × ${c})/${a} = ${answer}.`]);
}

function angleCase(outcomeId: string, grade: 7 | 8 | 9, ordinal: number, family: string): WaveKCaseSeed {
  const key = keyOf(outcomeId) + ordinal * 23;
  const quadrilateral = /quadrilateral|rectangle|rhombus|trapezoid|parallelogram|square/iu.test(family);
  const total = quadrilateral ? 360 : 180;
  const a = quadrilateral ? 70 + key % 21 : 35 + key % 31;
  const b = quadrilateral ? 80 + ordinal * 3 : 45 + ordinal * 2;
  const c = quadrilateral ? 90 + key % 11 : 0;
  const answer = total - a - b - c;
  const publicAngles = quadrilateral ? `${a}°, ${b}° và ${c}°` : `${a}° và ${b}°`;
  if (ordinal > 3) {
    const remainingSum = total - a;
    return baseSeed(outcomeId, grade, ordinal, `${family}:remaining-angle-sum-${ordinal - 3}`,
      `${context(outcomeId)} xét ${quadrilateral ? "một tứ giác lồi" : "một tam giác"} có một góc bằng ${a}°. Tổng các góc còn lại bằng bao nhiêu độ?`,
      String(remainingSum), numericOptions(remainingSum, ordinal), "ANGLE_COMPLEMENT_TO_TOTAL", { total, a },
      [`Tổng các góc bằng ${total}°.`, `Tổng còn lại là ${total} - ${a} = ${remainingSum}°.`]);
  }
  return baseSeed(outcomeId, grade, ordinal, `${family}:angle-relation-${(ordinal - 1) % 3 + 1}`,
    `${context(outcomeId)} xét ${quadrilateral ? "một tứ giác lồi" : "một tam giác"} có các góc đã biết là ${publicAngles}. Góc còn lại bằng bao nhiêu độ?`,
    String(answer), numericOptions(answer, ordinal), "ANGLE_REMAINDER", { total, a, b, c },
    [`Tổng các góc bằng ${total}°.`, `Góc còn lại là ${total} - ${a} - ${b}${quadrilateral ? ` - ${c}` : ""} = ${answer}°.`]);
}

function rotationCase(outcomeId: string, grade: 7 | 8 | 9, ordinal: number, family: string): WaveKCaseSeed {
  const sideCounts = [3, 4, 5, 6, 8, 10] as const;
  const sides = sideCounts[(keyOf(outcomeId) + ordinal) % sideCounts.length]!;
  const answer = 360 / sides;
  if (ordinal > 3) {
    return baseSeed(outcomeId, grade, ordinal, `${family}:recover-sides-${ordinal - 3}`,
      `${context(outcomeId)} góc quay dương nhỏ nhất giữ nguyên một đa giác đều là ${answer}°. Đa giác đó có bao nhiêu cạnh?`,
      String(sides), numericOptions(sides, ordinal), "REGULAR_POLYGON_SIDES", { angle: answer },
      [`Số cạnh bằng 360° chia cho góc quay nhỏ nhất.`, `360/${answer} = ${sides} cạnh.`]);
  }
  return baseSeed(outcomeId, grade, ordinal, `${family}:rotation-${(ordinal - 1) % 3 + 1}`,
    `${context(outcomeId)} xét một đa giác đều ${sides} cạnh. Góc quay dương nhỏ nhất đưa đa giác trùng với chính nó bằng bao nhiêu độ?`,
    String(answer), numericOptions(answer, ordinal), "REGULAR_POLYGON_ROTATION", { sides },
    [`Một vòng tròn có 360° và ${sides} vị trí đỉnh tương đương.`, `Góc quay nhỏ nhất là 360/${sides} = ${answer}°.`]);
}

function rightTriangleCase(outcomeId: string, grade: 7 | 8 | 9, ordinal: number, family: string): WaveKCaseSeed {
  const triples = [[3, 4, 5], [5, 12, 13], [8, 15, 17]] as const;
  const [baseA, baseB, baseC] = triples[(keyOf(outcomeId) + ordinal) % triples.length]!;
  const scale = 1 + ordinal % 3;
  const a = baseA * scale, b = baseB * scale, answer = baseC * scale;
  if (ordinal > 3) {
    return baseSeed(outcomeId, grade, ordinal, `${family}:missing-leg-${ordinal - 3}`,
      `${context(outcomeId)} một tam giác vuông có cạnh huyền ${answer} và một cạnh góc vuông ${a}. Cạnh góc vuông còn lại dài bao nhiêu?`,
      String(b), numericOptions(b, ordinal), "RIGHT_TRIANGLE_MISSING_LEG", { hypotenuse: answer, leg: a },
      [`Áp dụng b² = ${answer}² - ${a}².`, `Suy ra b = ${b}.`]);
  }
  return baseSeed(outcomeId, grade, ordinal, `${family}:right-triangle-${(ordinal - 1) % 3 + 1}`,
    `${context(outcomeId)} một tam giác vuông có hai cạnh góc vuông dài ${a} và ${b}. Cạnh huyền dài bao nhiêu?`,
    String(answer), numericOptions(answer, ordinal), "RIGHT_TRIANGLE_HYPOTENUSE", { a, b },
    [`Áp dụng c² = ${a}² + ${b}².`, `Suy ra c = ${answer}.`]);
}

function circleCase(outcomeId: string, grade: 7 | 8 | 9, ordinal: number, family: string): WaveKCaseSeed {
  const key = keyOf(outcomeId) + ordinal * 29;
  if (/relative-position/iu.test(family)) {
    const r1 = 3 + key % 5;
    const r2 = /two-circle/iu.test(family) ? 2 + ordinal % 4 : 0;
    const thresholds = r2 ? [Math.abs(r1 - r2), r1 + r2] : [r1, r1];
    const selector = ordinal % 3;
    const distance = selector === 0 ? thresholds[1]! + 2 : selector === 1 ? thresholds[1]! : Math.max(0, thresholds[0]! - 1);
    const answer = r2
      ? distance === 0 && r1 === r2 ? "trùng nhau"
        : distance > r1 + r2 || distance < Math.abs(r1 - r2) ? "không giao nhau"
          : distance === r1 + r2 || distance === Math.abs(r1 - r2) ? "tiếp xúc" : "cắt nhau"
      : distance > r1 ? "không giao nhau" : distance === r1 ? "tiếp xúc" : "cắt nhau";
    if (ordinal > 3) {
      const tangentDistance = r2 ? r1 + r2 : r1;
      return baseSeed(outcomeId, grade, ordinal, `${family}:tangent-threshold-${ordinal - 3}`,
        `${context(outcomeId)} cho ${r2 ? `hai đường tròn bán kính ${r1} và ${r2}` : `một đường tròn bán kính ${r1}`}. Khoảng cách ${r2 ? "giữa hai tâm" : "từ tâm đến đường thẳng"} bằng bao nhiêu để tiếp xúc ngoài?`,
        String(tangentDistance), numericOptions(tangentDistance, ordinal), "CIRCLE_TANGENT_DISTANCE", { radius1: r1, radius2: r2 },
        [r2 ? "Tiếp xúc ngoài khi khoảng cách hai tâm bằng tổng hai bán kính." : "Tiếp xúc khi khoảng cách từ tâm đến đường thẳng bằng bán kính.", `Khoảng cách cần tìm là ${tangentDistance}.`]);
    }
    const options = rotatedOptions(answer, ["cắt nhau", "tiếp xúc", "không giao nhau", "trùng nhau"], ordinal);
    return baseSeed(outcomeId, grade, ordinal, `${family}:distance-classification-${selector + 1}`,
      `${context(outcomeId)} cho ${r2 ? `hai đường tròn bán kính ${r1} và ${r2}, khoảng cách hai tâm là ${distance}` : `đường tròn bán kính ${r1}, khoảng cách từ tâm đến đường thẳng là ${distance}`}. Hai đối tượng ở vị trí nào?`,
      answer, options, "CIRCLE_POSITION", { radius1: r1, radius2: r2, distance },
      ["So sánh khoảng cách đã cho với bán kính hoặc tổng/hiệu hai bán kính.", `Quan hệ đúng là: ${answer}.`]);
  }
  const radius = 2 + key % 7;
  const multiplier = 1 + ordinal % 4;
  const answer = radius * radius * multiplier;
  if (ordinal > 3) {
    return baseSeed(outcomeId, grade, ordinal, `${family}:recover-radius-${ordinal - 3}`,
      `${context(outcomeId)} tổng diện tích của ${multiplier} hình tròn bằng ${answer}π và các bán kính bằng nhau. Bán kính mỗi hình bằng bao nhiêu?`,
      String(radius), numericOptions(radius, ordinal), "CIRCLE_RADIUS_FROM_COEFFICIENT", { coefficient: answer, multiplier },
      [`Mỗi bán kính r thỏa ${multiplier}r² = ${answer}.`, `Suy ra r² = ${answer / multiplier} và r = ${radius}.`]);
  }
  return baseSeed(outcomeId, grade, ordinal, `${family}:circle-measure-${(ordinal - 1) % 3 + 1}`,
    `${context(outcomeId)} một hình gồm ${multiplier} hình tròn không chồng lấn, mỗi hình có bán kính ${radius}. Tổng diện tích có dạng kπ. Giá trị của k là bao nhiêu?`,
    String(answer), numericOptions(answer, ordinal), "CIRCLE_PI_COEFFICIENT", { radius, multiplier },
    [`Mỗi hình tròn có diện tích ${radius}²π.`, `Vì có ${multiplier} hình nên k = ${multiplier} × ${radius}² = ${answer}.`]);
}

function trigonometryCase(outcomeId: string, grade: 7 | 8 | 9, ordinal: number, family: string): WaveKCaseSeed {
  if (/special-angle/iu.test(family)) {
    const rows = [
      { angle: 30, fn: "sin", answer: "1/2" }, { angle: 60, fn: "cos", answer: "1/2" },
      { angle: 45, fn: "tan", answer: "1" }, { angle: 30, fn: "cos", answer: "√3/2" },
      { angle: 60, fn: "sin", answer: "√3/2" }, { angle: 45, fn: "sin", answer: "√2/2" },
    ] as const;
    const row = rows[ordinal - 1]!;
    const complementaryPrefix = ordinal > 3
      ? `Dùng quan hệ hai góc phụ nhau, `
      : "";
    return baseSeed(outcomeId, grade, ordinal, `${family}:${ordinal <= 3 ? "direct" : "complementary"}-${ordinal}`,
      `${context(outcomeId)} ${complementaryPrefix}giá trị chính xác của ${row.fn} ${row.angle}° là gì?`, row.answer,
      rotatedOptions(row.answer, ["1/2", "1", "√2/2", "√3/2", "2/√3"], ordinal), "SPECIAL_TRIG", { angle: row.angle, function: row.fn },
      [`Dùng tam giác vuông đặc biệt ứng với góc ${row.angle}°.`, `${row.fn} ${row.angle}° = ${row.answer}.`]);
  }
  const triples = [[3, 4, 5], [5, 12, 13], [8, 15, 17]] as const;
  const [opposite, adjacent, hypotenuse] = triples[(keyOf(outcomeId) + ordinal) % triples.length]!;
  if (/applied/iu.test(family) && ordinal <= 3) {
    return baseSeed(outcomeId, grade, ordinal, `${family}:applied-height-${ordinal}`,
      `${context(outcomeId)} một thang dài ${hypotenuse} tựa vào tường thẳng đứng, chân thang cách tường ${adjacent}. Đầu thang cao bao nhiêu so với mặt đất?`,
      String(opposite), numericOptions(opposite, ordinal), "RIGHT_TRIANGLE_MISSING_LEG", { hypotenuse, leg: adjacent },
      ["Tường, mặt đất và thang tạo thành tam giác vuông.", `Chiều cao = √(${hypotenuse}² - ${adjacent}²) = ${opposite}.`]);
  }
  if (ordinal > 3) {
    const scale = ordinal - 2;
    if (ordinal === 6) {
      const cotAnswer = fraction(adjacent, opposite);
      return baseSeed(outcomeId, grade, ordinal, `${family}:ratio-cot`,
        `${context(outcomeId)} trong tam giác vuông, với góc α có cạnh đối ${opposite}, cạnh kề ${adjacent}. Giá trị cot α là gì?`,
        cotAnswer, rotatedOptions(cotAnswer, [fraction(opposite, adjacent), fraction(opposite, hypotenuse), fraction(adjacent, hypotenuse), fraction(hypotenuse, adjacent)], ordinal),
        "TRIG_RATIO", { opposite, adjacent, hypotenuse, function: "cot" },
        ["Cotang bằng cạnh kề chia cạnh đối.", `cot α = ${cotAnswer}.`]);
    }
    const cosine = ordinal === 5;
    const answer = (cosine ? adjacent : opposite) * scale;
    return baseSeed(outcomeId, grade, ordinal, `${family}:side-from-sine-${ordinal - 3}`,
      `${context(outcomeId)} ${/applied/iu.test(family) ? "một thanh đỡ tạo tam giác vuông trong mô hình đo đạc; " : ""}tam giác có ${cosine ? "cos" : "sin"} α = ${fraction(cosine ? adjacent : opposite, hypotenuse)} và cạnh huyền dài ${hypotenuse * scale}. Cạnh ${cosine ? "kề" : "đối"} góc α dài bao nhiêu?`,
      String(answer), numericOptions(answer, ordinal), cosine ? "TRIG_SIDE_FROM_COS" : "TRIG_SIDE_FROM_SINE",
      { component: cosine ? adjacent : opposite, hypotenuse, scaledHypotenuse: hypotenuse * scale },
      [`Cạnh ${cosine ? "kề" : "đối"} = cạnh huyền × ${cosine ? "cos" : "sin"} α.`, `${hypotenuse * scale} × ${fraction(cosine ? adjacent : opposite, hypotenuse)} = ${answer}.`]);
  }
  const fn = ordinal === 1 ? "sin" : ordinal === 2 ? "cos" : "tan";
  const answer = fn === "sin" ? fraction(opposite, hypotenuse) : fn === "cos" ? fraction(adjacent, hypotenuse) : fraction(opposite, adjacent);
  return baseSeed(outcomeId, grade, ordinal, `${family}:ratio-${fn}`,
    `${context(outcomeId)} trong tam giác vuông, với góc α có cạnh đối ${opposite}, cạnh kề ${adjacent}, cạnh huyền ${hypotenuse}. Giá trị ${fn} α là gì?`,
    answer, rotatedOptions(answer, [fraction(adjacent, hypotenuse), fraction(opposite, adjacent), fraction(hypotenuse, opposite), fraction(adjacent, opposite)], ordinal),
    "TRIG_RATIO", { opposite, adjacent, hypotenuse, function: fn },
    [`Dùng định nghĩa tỉ số ${fn} của góc nhọn.`, `${fn} α = ${answer}.`]);
}

function tangentCase(outcomeId: string, grade: 7 | 8 | 9, ordinal: number, family: string): WaveKCaseSeed {
  const triples = [[3, 4, 5], [5, 12, 13], [8, 15, 17]] as const;
  const [radius, tangent, centerDistance] = triples[(keyOf(outcomeId) + ordinal) % triples.length]!;
  if (ordinal > 3) {
    return baseSeed(outcomeId, grade, ordinal, `${family}:equal-tangents-${ordinal - 3}`,
      `${context(outcomeId)} từ điểm P ngoài đường tròn kẻ hai tiếp tuyến PA và PB. Nếu PA = ${tangent}, PB bằng bao nhiêu?`,
      String(tangent), numericOptions(tangent, ordinal), "TWO_TANGENTS_EQUAL", { tangent },
      ["Hai tiếp tuyến kẻ từ cùng một điểm ngoài đến một đường tròn có độ dài bằng nhau.", `PB = PA = ${tangent}.`]);
  }
  return baseSeed(outcomeId, grade, ordinal, `${family}:tangent-length-${ordinal}`,
    `${context(outcomeId)} điểm P cách tâm O của đường tròn ${centerDistance}; bán kính tới tiếp điểm T dài ${radius}. Độ dài tiếp tuyến PT bằng bao nhiêu?`,
    String(tangent), numericOptions(tangent, ordinal), "TANGENT_LENGTH", { radius, centerDistance },
    ["OT vuông góc PT tại tiếp điểm.", `PT = √(${centerDistance}² - ${radius}²) = ${tangent}.`]);
}

function cyclicQuadrilateralCase(outcomeId: string, grade: 7 | 8 | 9, ordinal: number, family: string): WaveKCaseSeed {
  const angle = 55 + (keyOf(outcomeId) + ordinal * 7) % 71;
  const opposite = 180 - angle;
  if (ordinal > 3) {
    return baseSeed(outcomeId, grade, ordinal, `${family}:cyclic-check-${ordinal - 3}`,
      `${context(outcomeId)} một tứ giác có hai góc đối bằng ${angle}° và ${opposite}°. Tổng hai góc đối bằng bao nhiêu độ?`,
      "180", numericOptions(180, ordinal), "CYCLIC_OPPOSITE_SUM", { angle, opposite },
      [`Cộng hai góc đối đã cho.`, `${angle} + ${opposite} = 180°.`]);
  }
  return baseSeed(outcomeId, grade, ordinal, `${family}:opposite-angle-${ordinal}`,
    `${context(outcomeId)} tứ giác ABCD nội tiếp đường tròn và góc A = ${angle}°. Góc C bằng bao nhiêu độ?`,
    String(opposite), numericOptions(opposite, ordinal), "CYCLIC_OPPOSITE_ANGLE", { angle },
    [`Hai góc đối của tứ giác nội tiếp bù nhau.`, `Góc C = 180° - ${angle}° = ${opposite}°.`]);
}

function circleMeasurementCase(outcomeId: string, grade: 7 | 8 | 9, ordinal: number, family: string): WaveKCaseSeed {
  const radius = 2 + (keyOf(outcomeId) + ordinal) % 6;
  if (ordinal > 3) {
    const inner = radius, outer = radius + 2;
    const answer = outer * outer - inner * inner;
    return baseSeed(outcomeId, grade, ordinal, `${family}:annulus-${ordinal - 3}`,
      `${context(outcomeId)} một vành khuyên có bán kính ngoài ${outer}, bán kính trong ${inner}. Diện tích có dạng kπ. k bằng bao nhiêu?`,
      String(answer), numericOptions(answer, ordinal), "ANNULUS_PI_COEFFICIENT", { outer, inner },
      ["Diện tích vành khuyên bằng hiệu diện tích hai hình tròn đồng tâm.", `k = ${outer}² - ${inner}² = ${answer}.`]);
  }
  const degrees = ordinal === 1 ? 90 : ordinal === 2 ? 180 : 120;
  if (ordinal === 1) {
    const arcNumerator = 2 * radius * degrees, arcDenominator = 360;
    const answer = fraction(arcNumerator, arcDenominator).replace(/\/1$/u, "");
    return baseSeed(outcomeId, grade, ordinal, `${family}:arc-length`,
      `${context(outcomeId)} cung tròn bán kính ${radius}, số đo ${degrees}°. Độ dài cung có dạng kπ. k bằng bao nhiêu?`,
      answer, rotatedOptions(answer, [String(radius), String(2 * radius), fraction(radius, 2), String(degrees)], ordinal),
      "ARC_PI_COEFFICIENT", { radius, degrees },
      [`k = (2 × ${radius} × ${degrees})/360.`, `Rút gọn được k = ${answer}.`]);
  }
  const numerator = radius * radius * degrees, denominator = 360;
  const divisor = gcd(numerator, denominator), reducedNumerator = numerator / divisor, reducedDenominator = denominator / divisor;
  const answer = reducedDenominator === 1 ? String(reducedNumerator) : `${reducedNumerator}/${reducedDenominator}`;
  return baseSeed(outcomeId, grade, ordinal, `${family}:sector-${ordinal}`,
    `${context(outcomeId)} hình quạt tròn bán kính ${radius}, góc ở tâm ${degrees}°. Diện tích có dạng kπ. k bằng bao nhiêu?`,
    answer, rotatedOptions(answer, [String(radius * radius), fraction(radius * degrees, 360), String(degrees), fraction(radius * radius, 2)], ordinal),
    "SECTOR_PI_COEFFICIENT", { radius, degrees },
    [`k = (${degrees}/360) × ${radius}².`, `Rút gọn được k = ${answer}.`]);
}

function circleCenterRadiusCase(outcomeId: string, grade: 7 | 8 | 9, ordinal: number, family: string): WaveKCaseSeed {
  const triples = [[6, 8, 10], [10, 24, 26], [16, 30, 34]] as const;
  const [a, b, c] = triples[(keyOf(outcomeId) + ordinal) % triples.length]!;
  if (/incircle/iu.test(family)) {
    const radius = (a + b - c) / 2;
    if (ordinal > 3) {
      return baseSeed(outcomeId, grade, ordinal, `${family}:incenter-coordinate-${ordinal - 3}`,
        `${context(outcomeId)} tam giác vuông có đỉnh góc vuông O(0,0), hai cạnh góc vuông nằm trên các trục dương và bán kính nội tiếp ${radius}. Hoành độ tâm đường tròn nội tiếp bằng bao nhiêu?`,
        String(radius), numericOptions(radius, ordinal), "AXIS_RIGHT_TRIANGLE_INCENTER_X", { radius },
        ["Tâm nội tiếp cách đều hai trục một khoảng bằng bán kính.", `Hoành độ tâm là ${radius}.`]);
    }
    return baseSeed(outcomeId, grade, ordinal, `${family}:${ordinal <= 3 ? "inradius" : "recover-hypotenuse"}-${ordinal}`,
      ordinal <= 3
        ? `${context(outcomeId)} tam giác vuông có hai cạnh góc vuông ${a}, ${b} và cạnh huyền ${c}. Bán kính đường tròn nội tiếp bằng bao nhiêu?`
        : `${context(outcomeId)} tam giác vuông có hai cạnh góc vuông ${a}, ${b} và bán kính nội tiếp ${radius}. Cạnh huyền bằng bao nhiêu?`,
      String(ordinal <= 3 ? radius : c), numericOptions(ordinal <= 3 ? radius : c, ordinal),
      ordinal <= 3 ? "RIGHT_TRIANGLE_INRADIUS" : "RIGHT_TRIANGLE_HYPOTENUSE_FROM_INRADIUS", { a, b, c, radius },
      ["Với tam giác vuông, r = (a + b - c)/2.", ordinal <= 3 ? `r = ${radius}.` : `c = a + b - 2r = ${c}.`]);
  }
  const radius = c / 2;
  if (ordinal > 3) {
    const centerX = a / 2;
    return baseSeed(outcomeId, grade, ordinal, `${family}:circumcenter-coordinate-${ordinal - 3}`,
      /quadrilateral/iu.test(family)
        ? `${context(outcomeId)} hình chữ nhật có hai đỉnh đối diện (0,0) và (${a},${b}). Hoành độ tâm đường tròn ngoại tiếp bằng bao nhiêu?`
        : `${context(outcomeId)} tam giác vuông có đỉnh góc vuông (0,0), hai đỉnh còn lại (${a},0) và (0,${b}). Hoành độ tâm đường tròn ngoại tiếp bằng bao nhiêu?`,
      String(centerX), numericOptions(centerX, ordinal), "MIDPOINT_X", { x1: 0, x2: a },
      ["Tâm ngoại tiếp là trung điểm đường chéo hoặc cạnh huyền.", `Hoành độ tâm là ${a}/2 = ${centerX}.`]);
  }
  return baseSeed(outcomeId, grade, ordinal, `${family}:${ordinal <= 3 ? "circumradius" : "recover-diameter"}-${ordinal}`,
    ordinal <= 3
      ? `${context(outcomeId)} ${/quadrilateral/iu.test(family) ? "hình chữ nhật" : "tam giác vuông"} có đường chéo${/quadrilateral/iu.test(family) ? "" : "/cạnh huyền"} dài ${c}. Bán kính đường tròn ngoại tiếp bằng bao nhiêu?`
      : `${context(outcomeId)} đường tròn ngoại tiếp có bán kính ${radius}. Đường kính tương ứng bằng bao nhiêu?`,
    String(ordinal <= 3 ? radius : c), numericOptions(ordinal <= 3 ? radius : c, ordinal),
    ordinal <= 3 ? "CIRCUMRADIUS_FROM_DIAMETER" : "CIRCUMDIAMETER_FROM_RADIUS", { diameter: c, radius },
    ["Tâm là trung điểm đường chéo hoặc cạnh huyền.", `Bán kính bằng một nửa đường kính: ${radius}.`]);
}

function circleSymmetryCase(outcomeId: string, grade: 7 | 8 | 9, ordinal: number, family: string): WaveKCaseSeed {
  const x = 1 + ordinal, y = 2 + ordinal;
  if (ordinal > 3) {
    return baseSeed(outcomeId, grade, ordinal, `${family}:recover-center-${ordinal - 3}`,
      `${context(outcomeId)} đường tròn tâm O(0,0) có điểm A(${x}, ${y}). Phản xạ qua trục Ox đưa A tới A′. Tung độ của A′ bằng bao nhiêu?`,
      String(-y), numericOptions(-y, ordinal), "AXIS_REFLECTION_Y", { y },
      ["Trục Ox là một trục đối xứng của đường tròn tâm O.", `Phản xạ qua Ox đổi tung độ ${y} thành ${-y}.`]);
  }
  return baseSeed(outcomeId, grade, ordinal, `${family}:central-image-${ordinal}`,
    `${context(outcomeId)} đường tròn tâm O(0,0) có điểm A(${x}, ${y}). Qua đối xứng tâm O, ảnh A′ có hoành độ bằng bao nhiêu?`,
    String(-x), numericOptions(-x, ordinal), "ORIGIN_SYMMETRY_X", { x },
    ["Đối xứng qua O đổi dấu cả hai tọa độ.", `Hoành độ ảnh là ${-x}.`]);
}

function chordCase(outcomeId: string, grade: 7 | 8 | 9, ordinal: number, family: string): WaveKCaseSeed {
  const radius = 3 + ordinal;
  const diameter = 2 * radius;
  if (ordinal > 3) {
    return baseSeed(outcomeId, grade, ordinal, `${family}:radius-from-max-chord-${ordinal - 3}`,
      `${context(outcomeId)} dây dài nhất của một đường tròn dài ${diameter}. Bán kính đường tròn bằng bao nhiêu?`,
      String(radius), numericOptions(radius, ordinal), "RADIUS_FROM_DIAMETER", { diameter },
      ["Dây dài nhất là đường kính.", `Bán kính là ${diameter}/2 = ${radius}.`]);
  }
  return baseSeed(outcomeId, grade, ordinal, `${family}:maximum-chord-${ordinal}`,
    `${context(outcomeId)} đường tròn bán kính ${radius}. Độ dài lớn nhất có thể của một dây là bao nhiêu?`,
    String(diameter), numericOptions(diameter, ordinal), "DIAMETER_FROM_RADIUS", { radius },
    ["Đường kính là dây dài nhất.", `Độ dài lớn nhất là 2 × ${radius} = ${diameter}.`]);
}

function powerOrRootCase(outcomeId: string, grade: 7 | 8 | 9, ordinal: number, family: string): WaveKCaseSeed {
  const key = keyOf(outcomeId) + ordinal * 31;
  if (/root/iu.test(family)) {
    const root = 2 + key % 9;
    const degree = /arithmetic-square-root/iu.test(family) ? 2 : ordinal % 2 === 0 ? 3 : 2;
    const radicand = root ** degree;
    const rootScope = /square-cube-root/iu.test(family) ? "Trong phạm vi căn bậc hai và căn bậc ba," : "Trong phạm vi căn bậc hai số học,";
    if (ordinal > 3) {
      return baseSeed(outcomeId, grade, ordinal, `${family}:recover-radicand-${ordinal - 3}`,
        `${context(outcomeId)} ${rootScope} một số có căn bậc ${degree} không âm bằng ${root}. Số đó bằng bao nhiêu?`,
        String(radicand), numericOptions(radicand, ordinal), "ROOT_RADICAND", { root, degree },
        [`Nâng ${root} lên lũy thừa bậc ${degree}.`, `${root}^${degree} = ${radicand}.`]);
    }
    return baseSeed(outcomeId, grade, ordinal, `${family}:exact-root-${(ordinal - 1) % 3 + 1}`,
      `${context(outcomeId)} ${rootScope} tính căn bậc ${degree} không âm của ${radicand}.`,
      String(root), numericOptions(root, ordinal), "EXACT_ROOT", { radicand, degree },
      [`Tìm số không âm mà lũy thừa bậc ${degree} bằng ${radicand}.`, `${root}^${degree} = ${radicand}, nên đáp án là ${root}.`]);
  }
  const base = 2 + key % 4;
  const exponent = 2 + ordinal % 3;
  const answer = base ** exponent;
  if (ordinal > 3) {
    return baseSeed(outcomeId, grade, ordinal, `${family}:recover-exponent-${ordinal - 3}`,
      `${context(outcomeId)} biết ${base}^n = ${answer}. Số mũ tự nhiên n bằng bao nhiêu?`,
      String(exponent), numericOptions(exponent, ordinal), "POWER_EXPONENT", { base, value: answer },
      [`Viết ${answer} dưới dạng lũy thừa của ${base}.`, `${answer} = ${base}^${exponent}, nên n = ${exponent}.`]);
  }
  return baseSeed(outcomeId, grade, ordinal, `${family}:exact-power-${(ordinal - 1) % 3 + 1}`,
    `${context(outcomeId)} tính ${base}^${exponent}.`, String(answer), numericOptions(answer, ordinal),
    "INTEGER_POWER", { base, exponent }, [`Nhân ${base} với chính nó ${exponent} lần.`, `Kết quả là ${answer}.`]);
}

function comparisonCase(outcomeId: string, grade: 7 | 8 | 9, ordinal: number, family: string): WaveKCaseSeed {
  const key = keyOf(outcomeId) + ordinal * 37;
  const left = (key % 19) - 9;
  const right = ordinal % 3 === 0 ? left : left + (ordinal % 2 === 0 ? 2 : -3);
  const answer = left < right ? "<" : left > right ? ">" : "=";
  if (ordinal > 3) {
    const shift = 2 + ordinal;
    const shiftedLeft = left + shift, shiftedRight = right + shift;
    const shiftedAnswer = shiftedLeft < shiftedRight ? "<" : shiftedLeft > shiftedRight ? ">" : "=";
    return baseSeed(outcomeId, grade, ordinal, `${family}:signed-gap-${ordinal - 3}`,
      `${context(outcomeId)} sau khi cộng cùng ${shift} vào hai số ${left} và ${right}, điền dấu đúng vào ${shiftedLeft} □ ${shiftedRight}.`,
      shiftedAnswer, rotatedOptions(shiftedAnswer, ["<", ">", "=", "không xác định"], ordinal), "INTEGER_COMPARISON", { left: shiftedLeft, right: shiftedRight },
      ["Cộng cùng một số giữ nguyên thứ tự.", `Dấu đúng vẫn là ${shiftedAnswer}.`]);
  }
  return baseSeed(outcomeId, grade, ordinal, `${family}:comparison-${(ordinal - 1) % 3 + 1}`,
    `${context(outcomeId)} điền dấu đúng vào ${left} □ ${right}.`, answer,
    rotatedOptions(answer, ["<", ">", "=", "không xác định"], ordinal), "INTEGER_COMPARISON", { left, right },
    [`So sánh trực tiếp ${left} và ${right} trên trục số.`, `Dấu đúng là ${answer}.`]);
}

function functionCase(outcomeId: string, grade: 7 | 8 | 9, ordinal: number, family: string): WaveKCaseSeed {
  const key = keyOf(outcomeId) + ordinal * 47;
  const a = 2 + key % 5, b = 1 + key % 7, x = ordinal - 3;
  const y = a * x + b;
  if (/value-table/iu.test(family) && ordinal > 3) {
    return baseSeed(outcomeId, grade, ordinal, `${family}:missing-table-input-${ordinal - 3}`,
      `${context(outcomeId)} trong bảng giá trị của y = ${a}x + ${b}, một hàng có y = ${y}. Giá trị x của hàng đó là bao nhiêu?`,
      String(x), numericOptions(x, ordinal), "AFFINE_SOLVE", { a, b, value: y },
      [`Giải ${a}x + ${b} = ${y}.`, `x = ${x}.`]);
  }
  const quadratic = /function-formula-evaluation/iu.test(family) && ordinal > 3;
  const answer = quadratic ? a * x * x + b : y;
  return baseSeed(outcomeId, grade, ordinal, `${family}:${quadratic ? "quadratic" : "linear"}-value-${(ordinal - 1) % 3 + 1}`,
    `${context(outcomeId)} ${/value-table/iu.test(family) ? "hoàn thành ô tương ứng trong bảng: " : ""}với ${quadratic ? `f(x) = ${a}x² + ${b}` : `y = ${a}x + ${b}`} và x = ${x}, giá trị cần điền là bao nhiêu?`,
    String(answer), numericOptions(answer, ordinal), quadratic ? "QUADRATIC_EVALUATION" : "AFFINE_EVALUATION",
    quadratic ? { a, x, b } : { a, x, b },
    [`Thay x = ${x} vào công thức đã cho.`, `Giá trị nhận được là ${answer}.`]);
}

function algebraCase(outcomeId: string, grade: 7 | 8 | 9, ordinal: number, family: string): WaveKCaseSeed {
  const key = keyOf(outcomeId) + ordinal * 41;
  const a = 2 + key % 6;
  const x = (ordinal % 5) - 2;
  const b = 3 + key % 9;
  const answer = a * x + b;
  if (ordinal > 3) {
    return baseSeed(outcomeId, grade, ordinal, `${family}:inverse-substitution-${ordinal - 3}`,
      `${context(outcomeId)} biết E = ${a}x + ${b} và E = ${answer}. Giá trị của x là bao nhiêu?`,
      String(x), numericOptions(x, ordinal), "AFFINE_SOLVE", { a, b, value: answer },
      [`Giải ${a}x + ${b} = ${answer}.`, `x = (${answer} - ${b})/${a} = ${x}.`]);
  }
  return baseSeed(outcomeId, grade, ordinal, `${family}:substitution-${(ordinal - 1) % 3 + 1}`,
    `${context(outcomeId)} xét biểu thức E = ${a}x + ${b}. Khi x = ${x}, giá trị chính xác của E là bao nhiêu?`,
    String(answer), numericOptions(answer, ordinal), "AFFINE_EVALUATION", { a, x, b },
    [`Thay x = ${x} vào E = ${a}x + ${b}.`, `E = ${a} × (${x}) + ${b} = ${answer}.`]);
}

function solidCase(outcomeId: string, grade: 7 | 8 | 9, ordinal: number, family: string): WaveKCaseSeed {
  const key = keyOf(outcomeId) + ordinal * 43;
  if (/plane-sphere/iu.test(family)) {
    const radius = 4 + key % 6;
    const selector = ordinal % 3;
    const distance = selector === 0 ? radius + 1 : selector === 1 ? radius : radius - 2;
    const answer = distance > radius ? "không giao" : distance === radius ? "một điểm" : "một đường tròn";
    if (ordinal > 3) {
      return baseSeed(outcomeId, grade, ordinal, `${family}:tangent-plane-distance-${ordinal - 3}`,
        `${context(outcomeId)} một mặt phẳng tiếp xúc với hình cầu bán kính ${radius}. Khoảng cách từ tâm đến mặt phẳng bằng bao nhiêu?`,
        String(radius), numericOptions(radius, ordinal), "SPHERE_TANGENT_DISTANCE", { radius },
        ["Mặt phẳng tiếp xúc khi khoảng cách từ tâm đến mặt phẳng bằng bán kính.", `Khoảng cách là ${radius}.`]);
    }
    return baseSeed(outcomeId, grade, ordinal, `${family}:intersection-${selector + 1}`,
      `${context(outcomeId)} một mặt phẳng cách tâm hình cầu ${distance} đơn vị, bán kính hình cầu là ${radius}. Phần chung là gì?`,
      answer, rotatedOptions(answer, ["không giao", "một điểm", "một đường tròn", "toàn bộ mặt cầu"], ordinal),
      "PLANE_SPHERE_INTERSECTION", { radius, distance },
      ["So sánh khoảng cách từ tâm đến mặt phẳng với bán kính.", `Phần chung là ${answer}.`]);
  }
  const length = 2 + key % 7;
  const width = 2 + ordinal % 5;
  const height = 3 + key % 4;
  const answer = length * width * height;
  if (ordinal > 3) {
    const lateralArea = 2 * height * (length + width);
    return baseSeed(outcomeId, grade, ordinal, `${family}:missing-height-${ordinal - 3}`,
      `${context(outcomeId)} một hộp chữ nhật không nắp có bốn mặt bên, chiều dài ${length}, chiều rộng ${width}, chiều cao ${height}. Tổng diện tích bốn mặt bên bằng bao nhiêu?`,
      String(lateralArea), numericOptions(lateralArea, ordinal), "BOX_LATERAL_AREA", { length, width, height },
      ["Diện tích bốn mặt bên là 2h(l + w).", `2 × ${height} × (${length} + ${width}) = ${lateralArea}.`]);
  }
  return baseSeed(outcomeId, grade, ordinal, `${family}:volume-${(ordinal - 1) % 3 + 1}`,
    `${context(outcomeId)} một hình hộp chữ nhật có chiều dài ${length}, chiều rộng ${width}, chiều cao ${height}. Thể tích bằng bao nhiêu?`,
    String(answer), numericOptions(answer, ordinal), "BOX_VOLUME", { length, width, height },
    ["Thể tích hình hộp chữ nhật bằng dài × rộng × cao.", `${length} × ${width} × ${height} = ${answer}.`]);
}

function makeCase(outcomeId: string, grade: 7 | 8 | 9, ordinal: number, family: string) {
  if (/data|frequency|statistics|sample/iu.test(family)) return dataCase(outcomeId, grade, ordinal, family);
  if (/function-value-table|function-formula-evaluation/iu.test(family)) return functionCase(outcomeId, grade, ordinal, family);
  if (/thales|similar|proportion|midsegment|angle-bisector-theorem/iu.test(family) || family.split("-").includes("ratio")) return proportionCase(outcomeId, grade, ordinal, family);
  if (/trigonometry|trigonometric|right-triangle-side-angle-relations/iu.test(family)) return trigonometryCase(outcomeId, grade, ordinal, family);
  if (/circle-tangent-properties/iu.test(family)) return tangentCase(outcomeId, grade, ordinal, family);
  if (/cyclic-quadrilateral/iu.test(family)) return cyclicQuadrilateralCase(outcomeId, grade, ordinal, family);
  if (/circle-arc-sector-annulus/iu.test(family)) return circleMeasurementCase(outcomeId, grade, ordinal, family);
  if (/circumcircle|incircle/iu.test(family)) return circleCenterRadiusCase(outcomeId, grade, ordinal, family);
  if (/circle-symmetry/iu.test(family)) return circleSymmetryCase(outcomeId, grade, ordinal, family);
  if (/diameter-chord/iu.test(family)) return chordCase(outcomeId, grade, ordinal, family);
  if (/circle|circum|incircle|arc|annulus|tangent|chord/iu.test(family)) return circleCase(outcomeId, grade, ordinal, family);
  if (/solid|sphere/iu.test(family)) return solidCase(outcomeId, grade, ordinal, family);
  if (/polygon|rotation/iu.test(family)) return rotationCase(outcomeId, grade, ordinal, family);
  if (/pythagorean|oblique-distance/iu.test(family)) return rightTriangleCase(outcomeId, grade, ordinal, family);
  if (/power|root/iu.test(family)) return powerOrRootCase(outcomeId, grade, ordinal, family);
  if (/angle|triangle|quadrilateral|parallel|perpendicular|rectangle|rhombus|trapezoid|parallelogram|square|geometry/iu.test(family)) return angleCase(outcomeId, grade, ordinal, family);
  if (/comparison|order|opposite|absolute|inequality/iu.test(family)) return comparisonCase(outcomeId, grade, ordinal, family);
  return algebraCase(outcomeId, grade, ordinal, family);
}

const producible = waveKClassificationDecisionsGrades7To9.filter(
  (decision) => decision.classification === "PRODUCIBLE_DETERMINISTIC",
);

export const waveKCaseSeedsG7G9 = Object.freeze(producible.flatMap((decision) => {
  if (!decision.templateFamily) throw new Error(`WAVE_K_TEMPLATE_FAMILY_MISSING:${decision.outcomeId}`);
  return Array.from({ length: 6 }, (_, index) => makeCase(
    decision.outcomeId,
    decision.grade as 7 | 8 | 9,
    index + 1,
    decision.templateFamily!,
  ));
})) satisfies readonly WaveKCaseSeed[];

function recompute(kind: string, payload: Payload): string {
  const number = (key: string) => {
    const value = payload[key];
    if (typeof value !== "number") throw new Error(`WAVE_K_ORACLE_NUMBER_REQUIRED:${key}`);
    return value;
  };
  const numbers = (key: string) => {
    const value = payload[key];
    if (!Array.isArray(value) || value.some((entry) => typeof entry !== "number")) throw new Error(`WAVE_K_ORACLE_NUMBERS_REQUIRED:${key}`);
    return value as readonly number[];
  };
  if (kind === "DATA_FREQUENCY") return String(numbers("values").filter((value) => value === number("target")).length);
  if (kind === "DATA_NON_TARGET_COUNT") return String(numbers("values").filter((value) => value !== number("target")).length);
  if (kind === "PROPORTION_FOURTH") return String(number("b") * number("c") / number("a"));
  if (kind === "RATIO_SCALE") return String(number("b") / number("a"));
  if (kind === "ANGLE_REMAINDER") return String(number("total") - number("a") - number("b") - number("c"));
  if (kind === "ANGLE_COMPLEMENT_TO_TOTAL") return String(number("total") - number("a"));
  if (kind === "CIRCLE_PI_COEFFICIENT") return String(number("radius") ** 2 * number("multiplier"));
  if (kind === "CIRCLE_RADIUS_FROM_COEFFICIENT") return String(Math.sqrt(number("coefficient") / number("multiplier")));
  if (kind === "CIRCLE_TANGENT_DISTANCE") return String(number("radius1") + number("radius2"));
  if (kind === "CIRCLE_POSITION") {
    const r1 = number("radius1"), r2 = number("radius2"), distance = number("distance");
    return r2
      ? distance === 0 && r1 === r2 ? "trùng nhau"
        : distance > r1 + r2 || distance < Math.abs(r1 - r2) ? "không giao nhau"
          : distance === r1 + r2 || distance === Math.abs(r1 - r2) ? "tiếp xúc" : "cắt nhau"
      : distance > r1 ? "không giao nhau" : distance === r1 ? "tiếp xúc" : "cắt nhau";
  }
  if (kind === "EXACT_ROOT") return String(Math.round(number("radicand") ** (1 / number("degree"))));
  if (kind === "ROOT_RADICAND") return String(number("root") ** number("degree"));
  if (kind === "INTEGER_POWER") return String(number("base") ** number("exponent"));
  if (kind === "POWER_EXPONENT") {
    const base = number("base"), value = number("value");
    let exponent = 0, product = 1;
    while (product < value) { product *= base; exponent += 1; }
    return product === value ? String(exponent) : "AUTOMATED_VERIFICATION_INSUFFICIENT";
  }
  if (kind === "INTEGER_COMPARISON") return number("left") < number("right") ? "<" : number("left") > number("right") ? ">" : "=";
  if (kind === "INTEGER_GAP") return String(number("right") - number("left"));
  if (kind === "AFFINE_EVALUATION") return String(number("a") * number("x") + number("b"));
  if (kind === "QUADRATIC_EVALUATION") return String(number("a") * number("x") ** 2 + number("b"));
  if (kind === "AFFINE_SOLVE") return String((number("value") - number("b")) / number("a"));
  if (kind === "BOX_VOLUME") return String(number("length") * number("width") * number("height"));
  if (kind === "BOX_LATERAL_AREA") return String(2 * number("height") * (number("length") + number("width")));
  if (kind === "BOX_MISSING_HEIGHT") return String(number("volume") / (number("length") * number("width")));
  if (kind === "PLANE_SPHERE_INTERSECTION") return number("distance") > number("radius") ? "không giao" : number("distance") === number("radius") ? "một điểm" : "một đường tròn";
  if (kind === "SPHERE_TANGENT_DISTANCE") return String(number("radius"));
  if (kind === "REGULAR_POLYGON_ROTATION") return String(360 / number("sides"));
  if (kind === "REGULAR_POLYGON_SIDES") return String(360 / number("angle"));
  if (kind === "RIGHT_TRIANGLE_HYPOTENUSE") return String(Math.sqrt(number("a") ** 2 + number("b") ** 2));
  if (kind === "RIGHT_TRIANGLE_MISSING_LEG") return String(Math.sqrt(number("hypotenuse") ** 2 - number("leg") ** 2));
  if (kind === "TRIG_RATIO") {
    const fn = payload.function;
    if (typeof fn !== "string") throw new Error("WAVE_K_ORACLE_STRING_REQUIRED:function");
    return fn === "sin" ? fraction(number("opposite"), number("hypotenuse"))
      : fn === "cos" ? fraction(number("adjacent"), number("hypotenuse"))
        : fn === "cot" ? fraction(number("adjacent"), number("opposite"))
          : fraction(number("opposite"), number("adjacent"));
  }
  if (kind === "TRIG_SIDE_FROM_SINE" || kind === "TRIG_SIDE_FROM_COS") return String(number("scaledHypotenuse") * number("component") / number("hypotenuse"));
  if (kind === "SPECIAL_TRIG") {
    const key = `${String(payload.function)}:${number("angle")}`;
    const values: Readonly<Record<string, string>> = { "sin:30": "1/2", "cos:60": "1/2", "tan:45": "1", "cos:30": "√3/2", "sin:60": "√3/2", "sin:45": "√2/2" };
    return values[key] ?? "AUTOMATED_VERIFICATION_INSUFFICIENT";
  }
  if (kind === "TANGENT_LENGTH") return String(Math.sqrt(number("centerDistance") ** 2 - number("radius") ** 2));
  if (kind === "TANGENT_CENTER_DISTANCE") return String(Math.sqrt(number("radius") ** 2 + number("tangent") ** 2));
  if (kind === "TWO_TANGENTS_EQUAL") return String(number("tangent"));
  if (kind === "CYCLIC_OPPOSITE_ANGLE") return String(180 - number("angle"));
  if (kind === "CYCLIC_OPPOSITE_SUM") return String(number("angle") + number("opposite"));
  if (kind === "ANNULUS_PI_COEFFICIENT") return String(number("outer") ** 2 - number("inner") ** 2);
  if (kind === "ARC_PI_COEFFICIENT") return fraction(2 * number("radius") * number("degrees"), 360).replace(/\/1$/u, "");
  if (kind === "SECTOR_PI_COEFFICIENT") return fraction(number("radius") ** 2 * number("degrees"), 360).replace(/\/1$/u, "");
  if (kind === "RIGHT_TRIANGLE_INRADIUS") return String((number("a") + number("b") - number("c")) / 2);
  if (kind === "AXIS_RIGHT_TRIANGLE_INCENTER_X") return String(number("radius"));
  if (kind === "RIGHT_TRIANGLE_HYPOTENUSE_FROM_INRADIUS") return String(number("a") + number("b") - 2 * number("radius"));
  if (kind === "CIRCUMRADIUS_FROM_DIAMETER") return String(number("diameter") / 2);
  if (kind === "CIRCUMDIAMETER_FROM_RADIUS") return String(number("radius") * 2);
  if (kind === "MIDPOINT_X") return String((number("x1") + number("x2")) / 2);
  if (kind === "ORIGIN_SYMMETRY_X") return String(-number("x"));
  if (kind === "AXIS_REFLECTION_Y") return String(-number("y"));
  if (kind === "RADIUS_FROM_DIAMETER") return String(number("diameter") / 2);
  if (kind === "DIAMETER_FROM_RADIUS") return String(number("radius") * 2);
  throw new Error(`WAVE_K_ORACLE_KIND_UNSUPPORTED:${kind}`);
}

export function verifyWaveKCasesG7G9(): readonly string[] {
  const errors: string[] = [];
  const expectedOutcomeIds = new Set(producible.map((decision) => decision.outcomeId));
  if (waveKCaseSeedsG7G9.length !== expectedOutcomeIds.size * 6) errors.push("WAVE_K_G7_G9_CASE_COUNT_MISMATCH");
  for (const outcomeId of expectedOutcomeIds) {
    const cases = waveKCaseSeedsG7G9.filter((seed) => seed.outcomeId === outcomeId);
    if (cases.length !== 6) errors.push(`${outcomeId}:POOL_SIZE_NOT_SIX`);
    if (new Set(cases.map((seed) => seed.structureTag)).size < 2) errors.push(`${outcomeId}:STRUCTURE_DIVERSITY_INSUFFICIENT`);
    if (new Set(cases.map((seed) => normalizedDefinition(`${seed.prompt}|${seed.options?.join("|") ?? ""}`))).size < 3) errors.push(`${outcomeId}:PUBLIC_FORM_DIVERSITY_INSUFFICIENT`);
  }
  for (const seed of waveKCaseSeedsG7G9) {
    const oracleAnswer = recompute(seed.oracle.kind, seed.oracle.payload);
    if (oracleAnswer !== seed.exactAnswer) errors.push(`${seed.outcomeId}:${seed.ordinal}:ORACLE_MISMATCH`);
    if (!seed.options || !seed.options.includes(seed.exactAnswer)) errors.push(`${seed.outcomeId}:${seed.ordinal}:ANSWER_NOT_IN_OPTIONS`);
    if (seed.options && new Set(seed.options).size !== seed.options.length) errors.push(`${seed.outcomeId}:${seed.ordinal}:OPTION_DUPLICATE`);
    for (const value of [seed.prompt, seed.exactAnswer, ...(seed.options ?? []), ...seed.explanationSteps]) {
      if (value !== value.normalize("NFC")) errors.push(`${seed.outcomeId}:${seed.ordinal}:NON_NFC`);
    }
  }
  return errors;
}
